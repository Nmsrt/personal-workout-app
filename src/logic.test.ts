import { describe, expect, it } from 'vitest'
import { buildSteps, buildWorkout, computePRs, logKey, restFor, suggestions, weekStart, weekStreak } from './logic'
import { seedRoutine } from './seed'
import type { Session, Workout } from './types'

const r = seedRoutine()

function fullSession(reps: (exIdx: number) => number, dur = 30): Session {
  const logs: Session['logs'] = {}
  r.exercises.forEach((ex, i) => {
    for (let k = 0; k < ex.sets; k++) logs[logKey(ex.id, k)] = { reps: ex.type === 'timed' ? 0 : reps(i), weight: ex.weight, duration: ex.type === 'timed' ? dur : 0 }
  })
  return { routineId: r.id, start: 1000, idx: 0, logs, rest: null }
}

describe('buildSteps', () => {
  it('one step per set, stretches optional', () => {
    expect(buildSteps(r, { useWarmup: false, useCooldown: false })).toHaveLength(14)
    expect(buildSteps(r, { useWarmup: true, useCooldown: true })).toHaveLength(20)
  })
  it('reflects edits to the routine', () => {
    const edited = { ...r, exercises: r.exercises.map((e, i) => (i === 0 ? { ...e, sets: 4 } : e)) }
    expect(buildSteps(edited, { useWarmup: false, useCooldown: false })).toHaveLength(16)
  })
})

describe('buildWorkout + PRs', () => {
  it('collects logged sets and flags PRs only against prior data', () => {
    const w1 = buildWorkout(r, fullSession(() => 10), 5000, [])
    expect(w1.exercises).toHaveLength(7)
    expect(w1.prs).toEqual([])
    const w2 = buildWorkout(r, fullSession((i) => (i === 1 ? 11 : 10), 35), 9000, [w1])
    expect(w2.prs.sort()).toEqual(['Plank', 'Push-ups'])
  })
  it('skipped sets are omitted', () => {
    const s = fullSession(() => 10)
    delete s.logs[logKey('s1', 1)]
    const w = buildWorkout(r, s, 5000, [])
    expect(w.exercises[0].sets).toHaveLength(1)
  })
  it('computePRs ignores first-ever exercise', () => {
    expect(computePRs([], [{ exerciseId: 'x', name: 'X', type: 'reps', targetRepMax: 1, targetWeight: 0, targetDuration: 0, targetSets: 1, sets: [{ reps: 5, weight: 0, duration: 0 }] }])).toEqual([])
  })
})

describe('suggestions', () => {
  it('suggests when top of range hit on all sets, and disappears after applying', () => {
    const w = buildWorkout(r, fullSession((i) => r.exercises[i].repMax), 5000, [])
    const sg = suggestions(r, w, 'kg')
    expect(sg.map((s) => s.name)).toContain('Goblet squats')
    expect(sg.map((s) => s.name)).toContain('Push-ups')
    expect(sg.map((s) => s.name)).toContain('Plank')
    const squat = sg.find((s) => s.name === 'Goblet squats')!
    const updated = { ...r, exercises: r.exercises.map((e) => (e.id === squat.exerciseId ? squat.apply(e) : e)) }
    expect(updated.exercises[0].weight).toBe(5)
    expect(suggestions(updated, w, 'kg').map((s) => s.name)).not.toContain('Goblet squats')
    const push = sg.find((s) => s.name === 'Push-ups')!
    expect(push.apply(r.exercises[1])).toMatchObject({ repMin: 10, repMax: 12 })
  })
  it('no suggestion below the top', () => {
    const w = buildWorkout(r, fullSession(() => 9, 20), 5000, [])
    expect(suggestions(r, w, 'kg')).toEqual([])
  })
})

describe('weekStreak', () => {
  const mk = (t: number): Workout => ({ id: String(t), routineId: 'x', routineName: 'x', start: t, end: t, exercises: [], prs: [] })
  const now = new Date(2026, 10, 5, 12).getTime() // Thu
  const ws = weekStart(now)
  const day = 86400000
  it('counts consecutive weeks meeting goal', () => {
    const h = [ws + day, ws + 2 * day, ws - 7 * day + day, ws - 7 * day + 3 * day, ws - 14 * day + day]
    expect(weekStreak(h.map(mk), 2, now)).toBe(2)
    expect(weekStreak(h.map(mk), 1, now)).toBe(3)
  })
  it('unfinished current week does not break streak', () => {
    const h = [ws - 7 * day + day, ws - 7 * day + 2 * day]
    expect(weekStreak(h.map(mk), 2, now)).toBe(1)
  })
})

describe('built-in routines', () => {
  it('fresh install has 5 routines with globally unique ids', async () => {
    const { defaultData } = await import('./seed')
    const d = defaultData()
    expect(d.routines.map((x) => x.name)).toEqual(['Upper Body & Posture', 'Lower Body & Core', 'Push Day', 'Pull Day', 'Full Body Express'])
    const exIds = d.routines.flatMap((x) => x.exercises.map((e) => e.id))
    expect(new Set(exIds).size).toBe(exIds.length)
    for (const rt of d.routines) expect(buildSteps(rt, { useWarmup: true, useCooldown: true }).length).toBeGreaterThan(0)
  })
  it('migration adds new presets once to existing data; deleted ones stay deleted', async () => {
    const { withPresets, seedRoutine } = await import('./seed')
    const { defaultSettings } = await import('./seed')
    const old = { version: 1 as const, routines: [seedRoutine()], activeRoutineId: 'seed-upper-body', history: [], settings: defaultSettings() }
    const migrated = withPresets(old)
    expect(migrated.routines).toHaveLength(5)
    expect(migrated.activeRoutineId).toBe('seed-upper-body')
    const deleted = { ...migrated, routines: migrated.routines.filter((x) => x.id !== 'preset-push') }
    expect(withPresets(deleted).routines).toHaveLength(4)
  })
})

describe('form guide detection', () => {
  it('every built-in exercise gets a specific illustration', async () => {
    const { defaultData } = await import('./seed')
    const { animFor, detectAnim } = await import('./figures/anims')
    const misses = defaultData().routines.flatMap((rt) => rt.exercises).filter((e) => !detectAnim(e.name)).map((e) => e.name)
    expect(misses).toEqual([])
    expect(animFor({ name: 'Plank' })).toBe('plank')
    expect(animFor({ name: 'Side plank' })).toBe('sideplank')
    expect(animFor({ name: 'Pike push-ups' })).toBe('pike')
    expect(animFor({ name: 'Single-arm rows' })).toBe('row1')
    expect(animFor({ name: 'Mystery move' })).toBe('stand')
    expect(animFor({ name: 'Plank', illustration: 'none' })).toBeNull()
    expect(animFor({ name: 'Plank', illustration: 'curl' })).toBe('curl')
  })
  it('every animation prepares without NaN', async () => {
    const { ANIMS } = await import('./figures/anims')
    const { prepare } = await import('./figures/rig')
    for (const [k, a] of Object.entries(ANIMS)) {
      const p = prepare(a)
      for (const t of [0, 0.5, 1]) for (const v of Object.values(p.frame(t))) expect(Number.isFinite(v[0]) && Number.isFinite(v[1]), k).toBe(true)
      expect(p.viewBox.every(Number.isFinite), k).toBe(true)
    }
  })
})

describe('break defaults', () => {
  it('default break is 1 minute and every built-in exercise uses it', async () => {
    const { defaultData } = await import('./seed')
    const d = defaultData()
    expect(d.settings.defaultRest).toBe(60)
    for (const rt of d.routines) for (const e of rt.exercises) expect(restFor(e, d.settings), `${rt.name} / ${e.name}`).toBe(60)
  })
  it('v2 migration moves Full Body Express off 30 s rests, keeps user-set rests', async () => {
    const { withPresets, fullBodyRoutine, seedRoutine, defaultSettings } = await import('./seed')
    const old = fullBodyRoutine()
    old.exercises = old.exercises.map((e, i) => ({ ...e, rest: i === 0 ? 45 : 30 }))
    const custom = { ...seedRoutine(), id: 'mine', exercises: seedRoutine().exercises.map((e) => ({ ...e, id: 'm' + e.id, rest: 30 })) }
    const out = withPresets({ version: 1, routines: [seedRoutine(), old, custom], activeRoutineId: 'seed-upper-body', history: [], settings: defaultSettings(), presets: 1 })
    const fb = out.routines.find((r) => r.id === 'preset-full-body')!
    expect(fb.exercises[0].rest).toBe(45)
    expect(fb.exercises.slice(1, 5).every((e) => e.rest === null)).toBe(true)
    expect(out.routines.find((r) => r.id === 'mine')!.exercises.every((e) => e.rest === 30)).toBe(true)
    expect(out.presets).toBe(2)
  })
})

describe('backup reminder', () => {
  const day = 86400000
  const now = Date.UTC(2026, 10, 5)
  const w = (end: number) => ({ id: String(end), routineId: 'x', routineName: 'x', start: end - 1000, end, exercises: [], prs: [] })
  const base = async () => (await import('./seed')).defaultData()
  it('never backed up: nudges after 3 workouts', async () => {
    const { backupDue } = await import('./backup')
    const d = await base()
    expect(backupDue({ ...d, history: [w(now - day), w(now - 2 * day)] }, now)).toBe(false)
    expect(backupDue({ ...d, history: [w(now - day), w(now - 2 * day), w(now - 3 * day)] }, now)).toBe(true)
  })
  it('backed up: due after 30 days only if new workouts since', async () => {
    const { backupDue } = await import('./backup')
    const d = await base()
    const last = now - 31 * day
    expect(backupDue({ ...d, lastBackup: last, history: [w(last - day)] }, now)).toBe(false)
    expect(backupDue({ ...d, lastBackup: last, history: [w(last + day)] }, now)).toBe(true)
    expect(backupDue({ ...d, lastBackup: now - 10 * day, history: [w(now - day)] }, now)).toBe(false)
  })
  it('Later snoozes for a week', async () => {
    const { backupDue, snoozeUntil } = await import('./backup')
    const d = { ...(await base()), history: [w(now - day), w(now - 2 * day), w(now - 3 * day)] }
    expect(backupDue({ ...d, backupSnoozeUntil: snoozeUntil(now) }, now + 6 * day)).toBe(false)
    expect(backupDue({ ...d, backupSnoozeUntil: snoozeUntil(now) }, now + 8 * day)).toBe(true)
  })
})
