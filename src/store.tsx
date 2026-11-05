import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { defaultData, defaultSettings, PRESETS, seedRoutine, withPresets } from './seed'
import type { AppData, Exercise, Routine, Session } from './types'
import { uid } from './util'

const KEY = 'wt.data.v1'
const SESSION_KEY = 'wt.session.v1'

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return withPresets(normalize(JSON.parse(raw)))
  } catch {
    /* fall through */
  }
  return defaultData()
}

/** Validates and fills missing fields. Throws on unusable input. */
export function normalize(x: unknown): AppData {
  const d = x as Partial<AppData>
  if (!d || typeof d !== 'object' || !Array.isArray(d.routines)) throw new Error('Not a workout backup: missing routines')
  const routines: Routine[] = (d.routines as Partial<Routine>[]).map((r) => {
    if (!r || typeof r.name !== 'string' || !Array.isArray(r.exercises)) throw new Error('Invalid routine')
    const exercises = (r.exercises as Partial<Exercise>[]).map((e) => {
      if (!e || typeof e.name !== 'string') throw new Error('Invalid exercise')
      return { id: uid(), type: 'reps', sets: 2, repMin: 8, repMax: 12, weight: 0, duration: 30, rest: null, notes: '', ...e } as Exercise
    })
    return { id: r.id ?? uid(), name: r.name, warmup: r.warmup ?? [], cooldown: r.cooldown ?? [], exercises }
  })
  if (!routines.length) routines.push(seedRoutine())
  const activeRoutineId = routines.some((r) => r.id === d.activeRoutineId) ? d.activeRoutineId! : routines[0].id
  return {
    version: 1,
    routines,
    activeRoutineId,
    history: Array.isArray(d.history) ? d.history : [],
    settings: { ...defaultSettings(), ...(d.settings ?? {}) },
    presets: typeof d.presets === 'number' ? d.presets : undefined,
    lastBackup: typeof d.lastBackup === 'number' ? d.lastBackup : undefined,
    backupSnoozeUntil: typeof d.backupSnoozeUntil === 'number' ? d.backupSnoozeUntil : undefined
  }
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

interface Ctx {
  data: AppData
  update: (fn: (d: AppData) => AppData) => void
  updateRoutine: (id: string, fn: (r: Routine) => Routine) => void
  session: Session | null
  setSession: (s: Session | null | ((s: Session | null) => Session | null)) => void
  /** Restore one built-in routine to its default contents (re-adds it if deleted). */
  resetPreset: (id: string) => void
  /** Re-add any deleted built-in routines. */
  restorePresets: () => void
}

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData)
  const [session, setSession] = useState<Session | null>(loadSession)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* quota */
    }
  }, [data])

  useEffect(() => {
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }, [session])

  const update = useCallback((fn: (d: AppData) => AppData) => setData(fn), [])
  const updateRoutine = useCallback(
    (id: string, fn: (r: Routine) => Routine) => setData((d) => ({ ...d, routines: d.routines.map((r) => (r.id === id ? fn(r) : r)) })),
    []
  )
  const resetPreset = useCallback((id: string) => {
    const make = PRESETS[id]
    if (!make) return
    setData((d) => {
      const fresh = make()
      const has = d.routines.some((r) => r.id === id)
      return { ...d, routines: has ? d.routines.map((r) => (r.id === id ? fresh : r)) : [...d.routines, fresh] }
    })
  }, [])
  const restorePresets = useCallback(() => {
    setData((d) => {
      const have = new Set(d.routines.map((r) => r.id))
      return { ...d, routines: [...d.routines, ...Object.entries(PRESETS).filter(([id]) => !have.has(id)).map(([, make]) => make())] }
    })
  }, [])

  return <StoreCtx.Provider value={{ data, update, updateRoutine, session, setSession, resetPreset, restorePresets }}>{children}</StoreCtx.Provider>
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('StoreProvider missing')
  return c
}

export const activeRoutine = (d: AppData) => d.routines.find((r) => r.id === d.activeRoutineId) ?? d.routines[0]
