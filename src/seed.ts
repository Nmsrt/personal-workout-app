import type { AppData, Exercise, Routine, Settings } from './types'

export const SEED_ID = 'seed-upper-body'

const ex = (id: string, name: string, p: Partial<Exercise>): Exercise => ({
  id,
  name,
  type: 'reps',
  sets: 2,
  repMin: 10,
  repMax: 12,
  weight: 0,
  duration: 30,
  rest: null,
  notes: '',
  ...p
})

/** Added to the starter routine in preset v4. */
const dumbbellCurls = () => ex('s8', 'Dumbbell curls', { repMin: 10, repMax: 12, weight: 4, notes: 'Elbows pinned to sides, palms up, slow on the way down.' })

export function seedRoutine(): Routine {
  return {
    id: SEED_ID,
    name: 'Starter Routine',
    exercises: [
      ex('s1', 'Goblet squats', { repMin: 10, repMax: 12, weight: 4, notes: 'Hold one dumbbell at chest. Sit back and down, chest up.' }),
      ex('s2', 'Push-ups', { repMin: 8, repMax: 10, notes: 'Bodyweight. Knees down if needed.' }),
      ex('s3', 'Two-arm bent-over rows', { repMin: 12, repMax: 12, weight: 4, notes: 'Hinge at hips, flat back, squeeze shoulder blades.' }),
      ex('s4', 'Overhead press', { repMin: 10, repMax: 12, weight: 4 }),
      ex('s5', 'Lateral raises', { repMin: 12, repMax: 12, weight: 4, notes: 'Raise to shoulder height, slow on the way down.' }),
      ex('s6', 'Reverse flyes', { repMin: 12, repMax: 12, weight: 4, notes: 'Bent over, lead with elbows.' }),
      dumbbellCurls(),
      ex('s7', 'Plank', { type: 'timed', repMin: 0, repMax: 0, duration: 30, notes: 'Straight line head to heels. Aim 25-30 s.' })
    ],
  }
}

/* ───── Weekly split (v7). Built in but not planned on any day; the user assigns days when ready. ───── */

const reps = (id: string, name: string, sets: number, repMin: number, repMax: number, weight: number, notes = ''): Exercise =>
  ex(id, name, { sets, repMin, repMax, weight, notes })
const hold = (id: string, name: string, sets: number, duration: number, notes = ''): Exercise =>
  ex(id, name, { type: 'timed', repMin: 0, repMax: 0, sets, duration, notes })

const MAX = 'Max reps: as many as you can with clean form.'

// A lift that appears in several built-in routines shares one exercise id (the starter's where it has one),
// because PRs and progress are tracked per exercise id. Ids only need to be unique within a routine.

export function pushRoutine(): Routine {
  return {
    id: 'split-push',
    name: 'Push',
    exercises: [
      reps('s2', 'Push-ups', 3, 8, 15, 0, MAX),
      reps('mo2', 'Single-arm overhead press', 3, 12, 15, 4, 'Reps per arm. Brace core, press straight up.'),
      reps('s5', 'Lateral raises', 3, 15, 20, 4, 'Raise to shoulder height, slow on the way down.'),
      reps('tx1', 'Overhead triceps extension', 3, 15, 15, 8, 'Hold both dumbbells together overhead, elbows pointing up.'),
      reps('mo5', 'Close-grip push-ups', 2, 6, 12, 0, 'Hands under shoulders, elbows tucked. ' + MAX)
    ]
  }
}

export function legsRoutine(): Routine {
  return {
    id: 'split-legs',
    name: 'Legs',
    exercises: [
      reps('tu1', 'Bulgarian split squats', 3, 10, 12, 0, 'Reps per leg. Back foot on a chair.'),
      reps('s1', 'Goblet squats', 3, 15, 20, 8, 'Hold both dumbbells at chest. 4-second lowering.'),
      reps('tu3', 'Single-leg glute bridge', 3, 15, 15, 0, 'Reps per leg. Squeeze at the top.'),
      reps('tu4', 'Single-leg calf raises', 3, 15, 20, 0, 'Reps per leg. On a stair edge, full range.'),
      hold('tu5', 'Wall sit', 2, 45, 'Thighs parallel to the floor, back flat on the wall.')
    ]
  }
}

export function pullRoutine(): Routine {
  return {
    id: 'split-pull',
    name: 'Pull',
    exercises: [
      reps('we1', 'One-arm rows', 3, 12, 15, 4, 'Reps per arm. Free hand on a chair or knee.'),
      reps('s6', 'Reverse flyes', 3, 15, 20, 4, 'Bent over, lead with elbows.'),
      reps('we3', 'Superman holds', 3, 12, 12, 0, 'Face down, lift arms and legs, short hold each rep.'),
      reps('s8', 'Dumbbell curls', 3, 12, 15, 4, 'Elbows pinned to sides, slow on the way down.'),
      reps('we5', 'Hammer curls', 2, 12, 15, 4, 'Palms face each other.')
    ]
  }
}

export function lowerCoreRoutine(): Routine {
  return {
    id: 'split-lower-core',
    name: 'Lower + Core',
    exercises: [
      reps('th1', 'Single-leg RDL', 3, 10, 10, 4, 'Reps per leg. Hips back, flat back.'),
      reps('th2', 'Reverse lunges', 3, 12, 12, 4, 'Reps per leg. One dumbbell in each hand.'),
      reps('th3', 'Paused glute bridge', 3, 15, 15, 0, 'Pause 2 s at the top.'),
      hold('s7', 'Plank', 3, 45, 'Straight line head to heels.'),
      reps('th5', 'Dead bugs', 3, 10, 10, 0, 'Reps per side. Lower back stays flat on the floor.'),
      reps('th6', 'Leg raises', 2, 12, 12, 0, 'Lying on your back, lower back pressed down.')
    ]
  }
}

export function upperPumpRoutine(): Routine {
  return {
    id: 'split-upper-pump',
    name: 'Upper Pump',
    exercises: [
      reps('fr1', 'Feet-elevated push-ups', 3, 6, 12, 0, 'Feet on a chair. ' + MAX),
      reps('s3', 'Bent-over rows', 3, 15, 15, 4, 'Hinge at hips, flat back, squeeze shoulder blades.'),
      reps('s5', 'Lateral raises', 2, 20, 20, 4, 'Raise to shoulder height, slow on the way down.'),
      reps('s8', 'Dumbbell curls', 2, 15, 15, 4, 'Superset with triceps extensions: alternate sets, short rest.'),
      reps('tx1', 'Overhead triceps extension', 2, 15, 15, 8, 'Superset with curls: alternate sets, short rest.'),
      hold('s7', 'Plank', 2, 45, 'Max hold: as long as you can with good form.')
    ]
  }
}

/* ───── Built-in routines retired in v6. Kept to migrate old data and to tell untouched copies from edited ones. ───── */

const timed = (id: string, name: string, duration: number, notes: string, sets = 2): Exercise =>
  ex(id, name, { type: 'timed', repMin: 0, repMax: 0, duration, notes, sets })

export function lowerBodyRoutine(): Routine {
  return {
    id: 'preset-lower-core',
    name: 'Lower Body & Core',
    exercises: [
      ex('lc1', 'Goblet squats', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'One dumbbell at chest. Pause 1 s at the bottom.' }),
      ex('lc2', 'Reverse lunges', { repMin: 10, repMax: 12, weight: 4, notes: 'Reps per leg. Dumbbells at your sides, step back softly.' }),
      ex('lc3', 'Romanian deadlifts', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Soft knees, push hips back, dumbbells close to legs.' }),
      ex('lc4', 'Glute bridges', { repMin: 15, repMax: 20, notes: 'Squeeze glutes 1 s at the top. Add a dumbbell on hips to progress.' }),
      ex('lc5', 'Calf raises', { repMin: 15, repMax: 20, weight: 4, notes: 'Full range, slow lower. Use a step if you have one.' }),
      ex('lc6', 'Dead bugs', { repMin: 10, repMax: 12, notes: 'Reps per side. Lower back stays flat on the floor.' }),
      timed('lc7', 'Side plank', 20, 'Per side. Hips high, straight line shoulders to feet.')
    ],
  }
}

export function fullBodyRoutine(): Routine {
  return {
    id: 'preset-full-body',
    name: 'Full Body Express',
    exercises: [
      ex('fb1', 'Goblet squats', { repMin: 12, repMax: 15, weight: 4 }),
      ex('fb2', 'Push-ups', { repMin: 8, repMax: 10 }),
      ex('fb3', 'Two-arm bent-over rows', { repMin: 12, repMax: 15, weight: 4 }),
      ex('fb4', 'Reverse lunges', { repMin: 8, repMax: 10, weight: 4, notes: 'Reps per leg.' }),
      ex('fb5', 'Overhead press', { repMin: 10, repMax: 12, weight: 4 }),
      timed('fb6', 'Mountain climbers', 30, 'Fast but controlled, hips level.')
    ],
  }
}

/** Built-in routines, in display order. Used for fresh installs, migration and "reset to default". */
export const PRESETS: Record<string, () => Routine> = {
  [SEED_ID]: seedRoutine,
  'split-push': pushRoutine,
  'split-legs': legsRoutine,
  'split-pull': pullRoutine,
  'split-lower-core': lowerCoreRoutine,
  'split-upper-pump': upperPumpRoutine
}
export const PRESET_VERSION = 8
/** Original contents of retired built-in routines (Push/Pull in v3, Lower/Full in v6). Used only to tell untouched copies from edited ones. */
const RETIRED: Record<string, () => Exercise[]> = {
  'preset-lower-core': () => lowerBodyRoutine().exercises,
  'preset-full-body': () => fullBodyRoutine().exercises,
  'preset-push': () => [
    ex('pu1', 'Push-ups', { sets: 3, repMin: 8, repMax: 12, notes: 'Elbows ~45° from body. Knees down if needed.' }),
    ex('pu2', 'Floor press', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Lie on floor, press dumbbells up, elbows touch floor lightly.' }),
    ex('pu3', 'Overhead press', { sets: 3, repMin: 10, repMax: 12, weight: 4, notes: 'Brace core, no arching. Press straight up.' }),
    ex('pu4', 'Lateral raises', { repMin: 12, repMax: 15, weight: 4, notes: 'Slight elbow bend, stop at shoulder height.' }),
    ex('pu5', 'Triceps kickbacks', { repMin: 12, repMax: 15, weight: 4, notes: 'Hinge forward, upper arm still, extend fully.' }),
    ex('pu6', 'Pike push-ups', { repMin: 6, repMax: 8, notes: 'Hips high, lower head toward floor. Shoulder focus.' }),
    timed('pu7', 'Plank', 30, 'Straight line head to heels.')
  ],
  'preset-pull': () => [
    ex('pl1', 'Two-arm bent-over rows', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Flat back, pull elbows to hips.' }),
    ex('pl2', 'Single-arm rows', { repMin: 12, repMax: 15, weight: 4, notes: 'Reps per arm. Free hand on knee or chair.' }),
    ex('pl3', 'Reverse flyes', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Bent over, lead with elbows, squeeze shoulder blades.' }),
    ex('pl4', 'Biceps curls', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Elbows pinned to sides, slow lower.' }),
    ex('pl5', 'Hammer curls', { repMin: 12, repMax: 15, weight: 4, notes: 'Palms face each other.' }),
    ex('pl6', 'Shrugs', { repMin: 15, repMax: 20, weight: 4, notes: 'Straight up to ears, hold 1 s.' }),
    timed('pl7', 'Superman hold', 20, 'Face down, lift arms and legs, squeeze upper back.')
  ]
}
const RETIRED_NAMES: Record<string, string> = {
  'preset-push': 'Push Day',
  'preset-pull': 'Pull Day',
  'preset-lower-core': 'Lower Body & Core',
  'preset-full-body': 'Full Body Express'
}

const EX_KEYS: (keyof Exercise)[] = ['id', 'name', 'type', 'sets', 'repMin', 'repMax', 'weight', 'duration', 'rest', 'notes', 'illustration', 'photo']
const sameExercise = (a: Exercise, b: Exercise) => EX_KEYS.every((k) => a[k] === b[k])

/** True when a retired preset still has its original contents and no planned days. Edited or planned copies are kept as the user's own. */
function untouchedRetired(r: Routine): boolean {
  const make = RETIRED[r.id]
  if (!make || r.name !== RETIRED_NAMES[r.id] || r.days?.length) return false
  const orig = make()
  return r.exercises.length === orig.length && r.exercises.every((e, i) => sameExercise(e, orig[i]))
}

/**
 * One-time add of presets introduced after a user's data was created. Deleted presets stay deleted.
 * `inUse` = routine id of an in-progress session; never removed.
 */
export function withPresets(d: AppData, inUse?: string): AppData {
  const v = d.presets ?? 0
  if (v >= PRESET_VERSION) return d
  let routines = d.routines
  // Retired presets are no longer in PRESETS, so Restore presets can't bring them back. A migration only drops an
  // untouched copy the user never used: one that is active, in progress, in history or planned on a day stays.
  const used = new Set([d.activeRoutineId, inUse, ...d.history.map((w) => w.routineId)])
  // v1 added Lower Body & Core and Full Body Express. Both were retired again in v6 and are not re-added here.
  if (v < 2) {
    // v2: Full Body Express used 30 s rests; breaks now default to the 1-minute setting
    routines = routines.map((r) =>
      r.id === 'preset-full-body' ? { ...r, exercises: r.exercises.map((e) => (e.id.startsWith('fb') && e.rest === 30 ? { ...e, rest: null } : e)) } : r
    )
  }
  if (v < 3) {
    // v3 retired Push/Pull (see `used` above)
    routines = routines.filter((r) => used.has(r.id) || !untouchedRetired(r))
  }
  if (v < 4) {
    // v4 added dumbbell curls to the starter routine (then named Upper Body & Posture). Inserted before the plank; the rest of the routine is
    // kept as the user left it. Skipped when it already has a curl (e.g. the user added one). Appended at the end
    // instead while a session on it is running, so the session's step index still points at the same set.
    routines = routines.map((r) => {
      if (r.id !== SEED_ID || r.exercises.some((e) => /curl/i.test(e.name) || e.id === 's8')) return r
      const at = inUse === SEED_ID ? -1 : r.exercises.findIndex((e) => e.id === 's7')
      const exercises = [...r.exercises]
      exercises.splice(at < 0 ? exercises.length : at, 0, dumbbellCurls())
      return { ...r, exercises }
    })
  }
  if (v < 5) {
    // v5 renamed Upper Body & Posture to Starter Routine. Only the name changes, and only if the user kept the old one.
    routines = routines.map((r) => (r.id === SEED_ID && r.name === 'Upper Body & Posture' ? { ...r, name: 'Starter Routine' } : r))
  }
  if (v < 6) {
    // v6 retired Lower Body & Core and Full Body Express, leaving the starter routine as the only general one.
    routines = routines.filter((r) => !(r.id === 'preset-lower-core' || r.id === 'preset-full-body') || used.has(r.id) || !untouchedRetired(r))
  }
  if (v < 7) {
    // v7 added the weekly split (Push, Legs, Pull, Lower + Core, Upper Pump), with no days planned
    const have = new Set(routines.map((r) => r.id))
    routines = [...routines, ...Object.entries(PRESETS).filter(([id]) => id !== SEED_ID && !have.has(id)).map(([, make]) => make())]
  }
  let history = d.history
  if (v < 8) {
    // v8: past starter-routine workouts show the new name in History too. Only the label changes.
    history = history.map((w) => (w.routineId === SEED_ID && w.routineName === 'Upper Body & Posture' ? { ...w, routineName: 'Starter Routine' } : w))
  }
  if (!routines.length) routines = [seedRoutine()]
  const activeRoutineId = routines.some((r) => r.id === d.activeRoutineId) ? d.activeRoutineId : routines[0].id
  return { ...d, routines, history, activeRoutineId, presets: PRESET_VERSION }
}

export const defaultSettings = (): Settings => ({
  sound: true,
  vibration: true,
  defaultRest: 60,
  getReady: 5,
  units: 'kg',
  weeklyGoal: 3,
  theme: 'light',
  reminderOn: false,
  reminderTime: '18:00',
  showGuides: true,
  restMode: 'manual'
})

export function defaultData(): AppData {
  return {
    version: 1,
    routines: Object.values(PRESETS).map((make) => make()),
    activeRoutineId: SEED_ID,
    history: [],
    settings: defaultSettings(),
    presets: PRESET_VERSION
  }
}
