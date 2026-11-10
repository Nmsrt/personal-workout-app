import { describe, expect, it } from 'vitest'
import { bestWeekStreak, buildSteps, buildWorkout, computePRs, logKey, monthStats, restFor, weekStart, weekStreak, weeklyCounts } from './logic'
import { seedRoutine } from './seed'
import type { AppData, Session, Workout } from './types'

const r = seedRoutine()
/** Routine ids, minus the weekly split that v7 adds, so older migration tests check only what they set up. */
const nonSplit = (d: AppData) => d.routines.map((x) => x.id).filter((id) => !id.startsWith('split-'))

function fullSession(reps: (exIdx: number) => number, dur = 30): Session {
  const logs: Session['logs'] = {}
  r.exercises.forEach((ex, i) => {
    for (let k = 0; k < ex.sets; k++) logs[logKey(ex.id, k)] = { reps: ex.type === 'timed' ? 0 : reps(i), weight: ex.weight, duration: ex.type === 'timed' ? dur : 0 }
  })
  return { routineId: r.id, start: 1000, idx: 0, logs, rest: null }
}

describe('buildSteps', () => {
  it('one step per set', () => {
    expect(buildSteps(r)).toHaveLength(16)
  })
  it('reflects edits to the routine', () => {
    const edited = { ...r, exercises: r.exercises.map((e, i) => (i === 0 ? { ...e, sets: 4 } : e)) }
    expect(buildSteps(edited)).toHaveLength(18)
  })
})

describe('buildWorkout + PRs', () => {
  it('collects logged sets and flags PRs only against prior data', () => {
    const w1 = buildWorkout(r, fullSession(() => 10), 5000, [])
    expect(w1.exercises).toHaveLength(8)
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
  it('fresh install has the starter routine plus the unplanned weekly split, with unique exercise ids per routine', async () => {
    const { defaultData } = await import('./seed')
    const d = defaultData()
    expect(d.routines.map((x) => x.name)).toEqual(['Starter Routine', 'Push', 'Legs', 'Pull', 'Lower + Core', 'Upper Pump'])
    expect(d.routines.every((x) => !x.days?.length)).toBe(true)
    for (const rt of d.routines) {
      const ids = rt.exercises.map((e) => e.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(buildSteps(rt).length).toBeGreaterThan(0)
    }
  })

  it('a lift in several built-in routines has one exercise id, so its PRs are compared across routines', async () => {
    const { defaultData } = await import('./seed')
    const byName = new Map<string, Set<string>>()
    for (const e of defaultData().routines.flatMap((x) => x.exercises)) byName.set(e.name, (byName.get(e.name) ?? new Set()).add(e.id))
    for (const [name, ids] of byName) expect([name, ids.size]).toEqual([name, 1])
  })

  it('v6 removes untouched Lower Body & Core and Full Body Express the user never used', async () => {
    const { withPresets, seedRoutine, lowerBodyRoutine, fullBodyRoutine, defaultSettings } = await import('./seed')
    const out = withPresets({ version: 1, routines: [seedRoutine(), lowerBodyRoutine(), fullBodyRoutine()], activeRoutineId: 'seed-upper-body', history: [], settings: defaultSettings(), presets: 5 })
    expect(nonSplit(out)).toEqual(['seed-upper-body'])
  })

  it('v6 keeps untouched retired routines that are active, in history or planned on a day', async () => {
    const { withPresets, seedRoutine, lowerBodyRoutine, fullBodyRoutine, defaultSettings } = await import('./seed')
    const w = { id: 'w', routineId: 'preset-full-body', routineName: 'Full Body Express', start: 1, end: 2, exercises: [], prs: [] }
    const base = { version: 1 as const, settings: defaultSettings(), presets: 5 }
    const active = withPresets({ ...base, routines: [seedRoutine(), lowerBodyRoutine(), fullBodyRoutine()], activeRoutineId: 'preset-lower-core', history: [w] })
    expect(nonSplit(active)).toEqual(['seed-upper-body', 'preset-lower-core', 'preset-full-body'])
    expect(active.activeRoutineId).toBe('preset-lower-core')
    expect(active.history).toEqual([w])
    const planned = { ...lowerBodyRoutine(), days: [1, 3] }
    const out = withPresets({ ...base, routines: [seedRoutine(), planned, fullBodyRoutine()], activeRoutineId: 'seed-upper-body', history: [] })
    expect(nonSplit(out)).toEqual(['seed-upper-body', 'preset-lower-core'])
    expect(out.routines[1].days).toEqual([1, 3])
  })

  it('split routines the user deleted are not re-added on later loads', async () => {
    const { withPresets, defaultData } = await import('./seed')
    const d = defaultData()
    const trimmed = { ...d, routines: d.routines.filter((x) => x.id !== 'split-legs' && x.id !== 'split-pull') }
    expect(withPresets(trimmed).routines.map((x) => x.id)).toEqual(['seed-upper-body', 'split-push', 'split-lower-core', 'split-upper-pump'])
  })

  it('v7 adds the weekly split unplanned, keeps the active routine and skips ones already there', async () => {
    const { withPresets, seedRoutine, pushRoutine, defaultSettings } = await import('./seed')
    const starter = { ...seedRoutine(), days: [0, 2, 4] }
    const out = withPresets({ version: 1, routines: [starter, pushRoutine()], activeRoutineId: 'seed-upper-body', history: [], settings: defaultSettings(), presets: 6 })
    expect(out.routines.map((x) => x.name)).toEqual(['Starter Routine', 'Push', 'Legs', 'Pull', 'Lower + Core', 'Upper Pump'])
    expect(out.routines[0].days).toEqual([0, 2, 4])
    expect(out.routines.slice(1).every((x) => !x.days?.length)).toBe(true)
    expect(out.activeRoutineId).toBe('seed-upper-body')
    expect(out.presets).toBe(8)
  })

  it('v8 renames past starter-routine workouts in history, leaving other workouts and the sets alone', async () => {
    const { withPresets, seedRoutine, defaultSettings } = await import('./seed')
    const sets = [{ reps: 10, weight: 4, duration: 0 }]
    const ex = { exerciseId: 's1', name: 'Goblet squats', type: 'reps' as const, targetRepMax: 12, targetWeight: 4, targetDuration: 30, targetSets: 2, sets }
    const old = { id: 'a', routineId: 'seed-upper-body', routineName: 'Upper Body & Posture', start: 1, end: 2, exercises: [ex], prs: [] }
    const other = { id: 'b', routineId: 'preset-full-body', routineName: 'Full Body Express', start: 3, end: 4, exercises: [], prs: [] }
    const out = withPresets({ version: 1, routines: [seedRoutine()], activeRoutineId: 'seed-upper-body', history: [old, other], settings: defaultSettings(), presets: 7 })
    expect(out.history).toEqual([{ ...old, routineName: 'Starter Routine' }, other])
  })

  it('v6 keeps edited copies and one an in-progress session uses', async () => {
    const { withPresets, seedRoutine, lowerBodyRoutine, fullBodyRoutine, defaultSettings } = await import('./seed')
    const lower = lowerBodyRoutine()
    const edited = { ...lower, exercises: lower.exercises.map((e, i) => (i === 0 ? { ...e, weight: 6 } : e)) }
    const d = { version: 1 as const, routines: [seedRoutine(), edited, fullBodyRoutine()], activeRoutineId: 'seed-upper-body', history: [], settings: defaultSettings(), presets: 5 }
    expect(nonSplit(withPresets(d))).toEqual(['seed-upper-body', 'preset-lower-core'])
    expect(nonSplit(withPresets(d, 'preset-full-body'))).toEqual(['seed-upper-body', 'preset-lower-core', 'preset-full-body'])
  })

  it('very old data (v0) ends with the starter routine and the weekly split; deleted ones stay deleted', async () => {
    const { withPresets, seedRoutine, defaultSettings } = await import('./seed')
    const old = { version: 1 as const, routines: [seedRoutine()], activeRoutineId: 'seed-upper-body', history: [], settings: defaultSettings() }
    const migrated = withPresets(old)
    expect(migrated.routines.map((x) => x.id)).toEqual(['seed-upper-body', 'split-push', 'split-legs', 'split-pull', 'split-lower-core', 'split-upper-pump'])
    const mine = { ...seedRoutine(), id: 'mine', name: 'Mine' }
    expect(withPresets({ ...migrated, routines: [mine] }).routines.map((x) => x.id)).toEqual(['mine'])
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
    expect(animFor({ name: 'Overhead triceps extension' })).toBe('ohp')
    expect(animFor({ name: 'Triceps kickbacks' })).toBe('kickback')
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
    expect(out.presets).toBe(8)
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

describe('v3 migration', () => {
  it('removes unused retired Push/Pull presets, keeps custom routines', async () => {
    const { withPresets, seedRoutine, defaultSettings } = await import('./seed')
    const { push, pull } = await oldPresets()
    const mine = { ...seedRoutine(), id: 'mine', name: 'Mine' }
    const out = withPresets({ version: 1, routines: [seedRoutine(), push, pull, mine], activeRoutineId: 'mine', history: [], settings: defaultSettings(), presets: 2 })
    expect(nonSplit(out)).toEqual(['seed-upper-body', 'mine'])
    expect(out.activeRoutineId).toBe('mine')
  })

  it('v4 adds dumbbell curls to an existing Upper Body routine, keeping user edits', async () => {
    const { withPresets, seedRoutine, defaultSettings } = await import('./seed')
    const old = seedRoutine()
    old.exercises = old.exercises.filter((e) => e.id !== 's8').map((e) => (e.id === 's2' ? { ...e, weight: 2, notes: 'mine' } : e))
    old.days = [0, 3]
    const mine = { id: 'mine', name: 'Mine', exercises: [] }
    const w = { id: 'w', routineId: 'seed-upper-body', routineName: 'Upper Body & Posture', start: 1, end: 2, exercises: [], prs: [] }
    const out = withPresets({ version: 1, routines: [old, mine], activeRoutineId: 'mine', history: [w], settings: defaultSettings(), presets: 3 })
    const up = out.routines.find((r) => r.id === 'seed-upper-body')!
    expect(up.exercises.map((e) => e.id)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's8', 's7'])
    expect(up.exercises[1]).toMatchObject({ weight: 2, notes: 'mine' })
    expect(up.days).toEqual([0, 3])
    expect(out.history).toEqual([{ ...w, routineName: 'Starter Routine' }])
    expect(out.activeRoutineId).toBe('mine')
    expect(out.routines.find((r) => r.id === 'mine')).toEqual(mine)
    // runs once
    expect(withPresets(out)).toBe(out)
  })

  it('v4 skips the curl when the routine already has one, and appends at the end while a session runs on it', async () => {
    const { withPresets, seedRoutine, defaultSettings } = await import('./seed')
    const base = seedRoutine()
    const withoutCurl = { ...base, exercises: base.exercises.filter((e) => e.id !== 's8') }
    const ownCurl = { ...withoutCurl, exercises: [...withoutCurl.exercises, { ...base.exercises[0], id: 'x', name: 'Hammer curls' }] }
    const d = (r: typeof base) => ({ version: 1 as const, routines: [r], activeRoutineId: r.id, history: [], settings: defaultSettings(), presets: 3 })
    expect(withPresets(d(ownCurl)).routines[0].exercises.map((e) => e.id)).toEqual(ownCurl.exercises.map((e) => e.id))
    const running = withPresets(d(withoutCurl), 'seed-upper-body').routines[0].exercises.map((e) => e.id)
    expect(running).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'])
  })

  it('v5 renames the starter routine only when it still has the old name, leaving its exercises alone', async () => {
    const { withPresets, seedRoutine, defaultSettings } = await import('./seed')
    const base = seedRoutine()
    const old = { ...base, name: 'Upper Body & Posture', exercises: base.exercises.slice(0, 3) }
    const custom = { ...base, name: 'My Upper Day' }
    const d = (r: typeof base) => ({ version: 1 as const, routines: [r], activeRoutineId: r.id, history: [], settings: defaultSettings(), presets: 4 })
    const out = withPresets(d(old)).routines[0]
    expect(out.name).toBe('Starter Routine')
    expect(out.exercises).toEqual(old.exercises)
    expect(withPresets(d(custom)).routines[0].name).toBe('My Upper Day')
  })

  it('keeps an untouched retired preset that is active or has history', async () => {
    const { withPresets, seedRoutine, defaultSettings } = await import('./seed')
    const { push, pull } = await oldPresets()
    const w = { id: 'w', routineId: 'preset-pull', routineName: 'Pull Day', start: 1, end: 2, exercises: [], prs: [] }
    const out = withPresets({ version: 1, routines: [seedRoutine(), push, pull], activeRoutineId: 'preset-push', history: [w], settings: defaultSettings(), presets: 2 })
    expect(nonSplit(out)).toEqual(['seed-upper-body', 'preset-push', 'preset-pull'])
    expect(out.activeRoutineId).toBe('preset-push')
  })

  it('keeps an edited retired preset', async () => {
    const { withPresets, seedRoutine, defaultSettings } = await import('./seed')
    const { push, pull } = await oldPresets()
    const edited = { ...push, exercises: push.exercises.map((e, i) => (i === 0 ? { ...e, weight: 2 } : e)) }
    const out = withPresets({ version: 1, routines: [seedRoutine(), edited, pull], activeRoutineId: 'preset-push', history: [], settings: defaultSettings(), presets: 2 })
    expect(nonSplit(out)).toEqual(['seed-upper-body', 'preset-push'])
    expect(out.activeRoutineId).toBe('preset-push')
  })

  it('keeps a retired preset that an in-progress session uses', async () => {
    const { withPresets, seedRoutine, defaultSettings } = await import('./seed')
    const { push, pull } = await oldPresets()
    const out = withPresets({ version: 1, routines: [seedRoutine(), push, pull], activeRoutineId: 'seed-upper-body', history: [], settings: defaultSettings(), presets: 2 }, 'preset-pull')
    expect(nonSplit(out)).toEqual(['seed-upper-body', 'preset-pull'])
  })
})

describe('legacy session', () => {
  const log = { reps: 10, weight: 4, duration: 0 }

  it('with warm-up on, shifts idx past the warm-up steps and keeps a running break', async () => {
    const { migrateSession, SESSION_LAYOUT } = await import('./store')
    const { defaultData, seedRoutine } = await import('./seed')
    const r = seedRoutine()
    const d = defaultData()
    // old layout: 3 warm-up steps, then sets; user was on step 4 = exercise 1 set 2
    const rest = { endAt: 99, total: 60000 }
    const old: Session = { routineId: r.id, start: 1, idx: 4, logs: { [logKey(r.exercises[0].id, 0)]: log }, rest }
    const s = migrateSession(old, d, 3)!
    expect(s.idx).toBe(1)
    expect(s.rest).toBe(rest)
    expect(s.layout).toBe(SESSION_LAYOUT)
    const cur = { ...old, layout: SESSION_LAYOUT }
    expect(migrateSession(cur, d)).toBe(cur)
  })

  it('on a warm-up step, goes to the first unlogged set', async () => {
    const { migrateSession } = await import('./store')
    const { defaultData, seedRoutine } = await import('./seed')
    const r = seedRoutine()
    const old: Session = { routineId: r.id, start: 1, idx: 1, logs: { [logKey(r.exercises[0].id, 0)]: log }, rest: null }
    expect(migrateSession(old, defaultData(), 3)!.idx).toBe(1)
  })

  it('with warm-up off, keeps idx and the running break (skipped sets stay skipped)', async () => {
    const { migrateSession, SESSION_LAYOUT } = await import('./store')
    const { defaultData, seedRoutine } = await import('./seed')
    const r = seedRoutine()
    const rest = { endAt: 99, total: 60000 }
    // skipped set 0, logged set 1, resting before step 2
    const old: Session = { routineId: r.id, start: 1, idx: 2, logs: { [logKey(r.exercises[0].id, 1)]: log }, rest }
    const s = migrateSession(old, defaultData())!
    expect(s).toEqual({ ...old, layout: SESSION_LAYOUT })
  })
})

/** Push/Pull exactly as shipped before v3 (with the defaults normalize fills in). */
async function oldPresets() {
  const base = { type: 'reps' as const, sets: 2, repMin: 10, repMax: 12, weight: 0, duration: 30, rest: null, notes: '' }
  const e = (id: string, name: string, p: object) => ({ ...base, id, name, ...p })
  const t = (id: string, name: string, duration: number, notes: string) => e(id, name, { type: 'timed', repMin: 0, repMax: 0, duration, notes })
  return {
    push: {
      id: 'preset-push',
      name: 'Push Day',
      exercises: [
        e('pu1', 'Push-ups', { sets: 3, repMin: 8, repMax: 12, notes: 'Elbows ~45° from body. Knees down if needed.' }),
        e('pu2', 'Floor press', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Lie on floor, press dumbbells up, elbows touch floor lightly.' }),
        e('pu3', 'Overhead press', { sets: 3, repMin: 10, repMax: 12, weight: 4, notes: 'Brace core, no arching. Press straight up.' }),
        e('pu4', 'Lateral raises', { repMin: 12, repMax: 15, weight: 4, notes: 'Slight elbow bend, stop at shoulder height.' }),
        e('pu5', 'Triceps kickbacks', { repMin: 12, repMax: 15, weight: 4, notes: 'Hinge forward, upper arm still, extend fully.' }),
        e('pu6', 'Pike push-ups', { repMin: 6, repMax: 8, notes: 'Hips high, lower head toward floor. Shoulder focus.' }),
        t('pu7', 'Plank', 30, 'Straight line head to heels.')
      ]
    },
    pull: {
      id: 'preset-pull',
      name: 'Pull Day',
      exercises: [
        e('pl1', 'Two-arm bent-over rows', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Flat back, pull elbows to hips.' }),
        e('pl2', 'Single-arm rows', { repMin: 12, repMax: 15, weight: 4, notes: 'Reps per arm. Free hand on knee or chair.' }),
        e('pl3', 'Reverse flyes', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Bent over, lead with elbows, squeeze shoulder blades.' }),
        e('pl4', 'Biceps curls', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Elbows pinned to sides, slow lower.' }),
        e('pl5', 'Hammer curls', { repMin: 12, repMax: 15, weight: 4, notes: 'Palms face each other.' }),
        e('pl6', 'Shrugs', { repMin: 15, repMax: 20, weight: 4, notes: 'Straight up to ears, hold 1 s.' }),
        t('pl7', 'Superman hold', 20, 'Face down, lift arms and legs, squeeze upper back.')
      ]
    }
  }
}

describe('summary stats', () => {
  const day = 86400000
  const now = new Date(2026, 10, 18, 12).getTime() // Wed 18 Nov
  const mk = (t: number, mins = 30, sets = 4, prs: string[] = []): Workout => ({
    id: String(t), routineId: 'x', routineName: 'x', start: t, end: t + mins * 60000, prs,
    exercises: [{ exerciseId: 'e', name: 'E', type: 'reps', targetRepMax: 1, targetWeight: 0, targetDuration: 0, targetSets: sets, sets: Array.from({ length: sets }, () => ({ reps: 1, weight: 0, duration: 0 })) }]
  })
  it('monthStats counts only this month', () => {
    const h = [mk(new Date(2026, 10, 2, 9).getTime(), 45, 6, ['E']), mk(new Date(2026, 10, 2, 18).getTime()), mk(new Date(2026, 10, 10).getTime()), mk(new Date(2026, 9, 30).getTime())]
    expect(monthStats(h, now)).toEqual({ workouts: 3, prevWorkouts: 1, activeDays: 2, minutes: 105, sets: 14, prs: 1, hasEarlier: true })
  })
  it('weeklyCounts returns n weeks ending this week', () => {
    const ws = weekStart(now)
    const wc = weeklyCounts([mk(ws + day), mk(ws - 7 * day + day), mk(ws - 7 * day + 2 * day)], 4, now)
    expect(wc.map((w) => w.count)).toEqual([0, 0, 2, 1])
    expect(wc[3].start).toBe(ws)
  })
  it('bestWeekStreak finds longest run', () => {
    const ws = weekStart(now)
    const h = [-70, -63, -56, -35, -28].map((d) => mk(ws + d * day + day))
    expect(bestWeekStreak(h, 1)).toBe(3)
    expect(bestWeekStreak([], 1)).toBe(0)
  })
})

describe('planned days', () => {
  it('formatDays labels', async () => {
    const { formatDays } = await import('./logic')
    expect(formatDays(undefined)).toBe('')
    expect(formatDays([])).toBe('')
    expect(formatDays([0, 2, 4])).toBe('Mon, Wed, Fri')
    expect(formatDays([0, 1, 2, 3, 4])).toBe('Weekdays')
    expect(formatDays([5, 6])).toBe('Weekends')
    expect(formatDays([0, 1, 2, 3, 4, 5, 6])).toBe('Every day')
  })
  it('scheduledOn uses Monday = 0', async () => {
    const { scheduledOn, weekdayIndex } = await import('./logic')
    const mon = new Date(2026, 10, 9, 12).getTime() // Mon 9 Nov 2026
    const sun = new Date(2026, 10, 15, 12).getTime()
    expect(weekdayIndex(mon)).toBe(0)
    expect(weekdayIndex(sun)).toBe(6)
    const rs = [{ id: 'a', days: [0, 2] }, { id: 'b' }, { id: 'c', days: [6] }]
    expect(scheduledOn(rs, mon).map((r) => r.id)).toEqual(['a'])
    expect(scheduledOn(rs, sun).map((r) => r.id)).toEqual(['c'])
  })
  it('normalize keeps valid days, drops junk, and keeps history', async () => {
    const { normalize } = await import('./store')
    const { defaultData } = await import('./seed')
    const d = defaultData()
    const w: Workout = { id: 'h1', routineId: d.routines[0].id, routineName: 'x', start: 1, end: 2, exercises: [], prs: [] }
    const raw = { ...d, history: [w], routines: [{ ...d.routines[0], days: [4, 0, 0, 9, -1, 2.5, 'x'] }, { ...d.routines[0], id: 'other' }] }
    const out = normalize(JSON.parse(JSON.stringify(raw)))
    expect(out.routines[0].days).toEqual([0, 4])
    expect(out.routines[1].days).toBeUndefined()
    expect(out.history).toEqual([w])
  })
})
