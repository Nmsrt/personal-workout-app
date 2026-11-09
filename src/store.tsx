import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { defaultData, defaultSettings, PRESETS, seedRoutine, withPresets } from './seed'
import { buildSteps, logKey } from './logic'
import type { AppData, Exercise, Routine, Session, Settings } from './types'
import { uid } from './util'

const KEY = 'wt.data.v1'
const SESSION_KEY = 'wt.session.v1'

/** `inUse` = routine of an in-progress session, kept through migrations. */
export function loadData(inUse?: string): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return withPresets(normalize(JSON.parse(raw)), inUse)
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
    const days = cleanDays(r.days)
    return { id: r.id ?? uid(), name: r.name, exercises, ...(days.length ? { days } : {}) }
  })
  if (!routines.length) routines.push(seedRoutine())
  const activeRoutineId = routines.some((r) => r.id === d.activeRoutineId) ? d.activeRoutineId! : routines[0].id
  return {
    version: 1,
    routines,
    activeRoutineId,
    history: Array.isArray(d.history) ? d.history : [],
    settings: pickSettings(d.settings),
    presets: typeof d.presets === 'number' ? d.presets : undefined,
    lastBackup: typeof d.lastBackup === 'number' ? d.lastBackup : undefined,
    backupSnoozeUntil: typeof d.backupSnoozeUntil === 'number' ? d.backupSnoozeUntil : undefined,
    autoPickDay: typeof d.autoPickDay === 'string' ? d.autoPickDay : undefined
  }
}

/** Valid weekday indexes (0-6), unique and sorted. The one place this rule is enforced; readers trust `Routine.days`. */
export function cleanDays(x: unknown): number[] {
  if (!Array.isArray(x)) return []
  return [...new Set(x.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6))].sort((a, b) => a - b)
}

function withCleanDays(r: Routine): Routine {
  if (r.days === undefined) return r
  const days = cleanDays(r.days)
  if (days.length) return { ...r, days }
  const { days: _, ...rest } = r
  return rest
}

/** Defaults + known keys only, so retired settings drop out of saved data. */
function pickSettings(x: unknown): Settings {
  const def = defaultSettings()
  const src = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
  const out = { ...def } as Record<string, unknown>
  for (const k of Object.keys(def)) if (k in src) out[k] = src[k]
  return out as unknown as Settings
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

/** Current step layout (sets only). Sessions saved before it may count warm-up steps in `idx`. */
export const SESSION_LAYOUT = 2

/**
 * Converts a legacy session's `idx` to the sets-only layout. `warmupSteps` = warm-up steps the old build put before
 * the sets (0 when warm-up was off, so `idx` and `rest` are already right and are kept as they are).
 */
export function migrateSession(s: Session | null, d: AppData, warmupSteps = 0): Session | null {
  if (!s || s.layout === SESSION_LAYOUT) return s
  const r = d.routines.find((x) => x.id === s.routineId)
  if (!r || warmupSteps <= 0) return { ...s, layout: SESSION_LAYOUT }
  const steps = buildSteps(r)
  const idx = s.idx - warmupSteps
  // Still inside the sets after the shift: keep the position and any running break.
  if (idx >= 0 && idx < steps.length) return { ...s, idx, layout: SESSION_LAYOUT }
  // Was on a warm-up or cool-down step: go to the first set not yet logged.
  const open = steps.findIndex((st) => !s.logs[logKey(r.exercises[st.exIdx].id, st.setIdx)])
  return { ...s, idx: open < 0 ? Math.max(0, steps.length - 1) : open, rest: null, layout: SESSION_LAYOUT }
}

/** Warm-up steps the old build showed before the sets of `routineId`, read from saved data before normalize drops them. */
function legacyWarmupSteps(routineId: string): number {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!d?.settings?.useWarmup) return 0
    const r = Array.isArray(d.routines) ? d.routines.find((x: { id?: string }) => x?.id === routineId) : undefined
    return Array.isArray(r?.warmup) ? r.warmup.length : 0
  } catch {
    return 0
  }
}

function loadState(): { data: AppData; session: Session | null } {
  const raw = loadSession()
  const warmup = raw && raw.layout !== SESSION_LAYOUT ? legacyWarmupSteps(raw.routineId) : 0
  const data = loadData(raw?.routineId)
  return { data, session: migrateSession(raw, data, warmup) }
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
  const [init] = useState(loadState)
  const [data, setData] = useState<AppData>(init.data)
  const [session, setSession] = useState<Session | null>(init.session)

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
    (id: string, fn: (r: Routine) => Routine) =>
      setData((d) => ({ ...d, routines: d.routines.map((r) => (r.id === id ? withCleanDays(fn(r)) : r)) })),
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
