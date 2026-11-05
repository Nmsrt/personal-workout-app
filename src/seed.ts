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

export function seedRoutine(): Routine {
  return {
    id: SEED_ID,
    name: 'Upper Body & Posture',
    exercises: [
      ex('s1', 'Goblet squats', { repMin: 10, repMax: 12, weight: 4, notes: 'Hold one dumbbell at chest. Sit back and down, chest up.' }),
      ex('s2', 'Push-ups', { repMin: 8, repMax: 10, notes: 'Bodyweight. Knees down if needed.' }),
      ex('s3', 'Two-arm bent-over rows', { repMin: 12, repMax: 12, weight: 4, notes: 'Hinge at hips, flat back, squeeze shoulder blades.' }),
      ex('s4', 'Overhead press', { repMin: 10, repMax: 12, weight: 4 }),
      ex('s5', 'Lateral raises', { repMin: 12, repMax: 12, weight: 4, notes: 'Raise to shoulder height, slow on the way down.' }),
      ex('s6', 'Reverse flyes', { repMin: 12, repMax: 12, weight: 4, notes: 'Bent over, lead with elbows.' }),
      ex('s7', 'Plank', { type: 'timed', repMin: 0, repMax: 0, duration: 30, notes: 'Straight line head to heels. Aim 25-30 s.' })
    ],
    warmup: [
      { id: 'w1', name: 'Arm circles', duration: 30 },
      { id: 'w2', name: 'Shoulder rolls', duration: 30 },
      { id: 'w3', name: 'Bodyweight squats', duration: 30 }
    ],
    cooldown: [
      { id: 'c1', name: 'Chest doorway stretch', duration: 30 },
      { id: 'c2', name: 'Cross-body shoulder stretch', duration: 30 },
      { id: 'c3', name: "Child's pose", duration: 30 }
    ]
  }
}

/* ───── Extra built-in routines (same kit: two 4 kg dumbbells + bodyweight) ───── */

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
    warmup: [
      { id: 'lcw1', name: 'Leg swings', duration: 30 },
      { id: 'lcw2', name: 'Hip circles', duration: 30 },
      { id: 'lcw3', name: 'Bodyweight squats', duration: 30 }
    ],
    cooldown: [
      { id: 'lcc1', name: 'Standing quad stretch', duration: 30 },
      { id: 'lcc2', name: 'Seated hamstring stretch', duration: 30 },
      { id: 'lcc3', name: 'Figure-4 glute stretch', duration: 30 }
    ]
  }
}

export function pushRoutine(): Routine {
  return {
    id: 'preset-push',
    name: 'Push Day',
    exercises: [
      ex('pu1', 'Push-ups', { sets: 3, repMin: 8, repMax: 12, notes: 'Elbows ~45° from body. Knees down if needed.' }),
      ex('pu2', 'Floor press', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Lie on floor, press dumbbells up, elbows touch floor lightly.' }),
      ex('pu3', 'Overhead press', { sets: 3, repMin: 10, repMax: 12, weight: 4, notes: 'Brace core, no arching. Press straight up.' }),
      ex('pu4', 'Lateral raises', { repMin: 12, repMax: 15, weight: 4, notes: 'Slight elbow bend, stop at shoulder height.' }),
      ex('pu5', 'Triceps kickbacks', { repMin: 12, repMax: 15, weight: 4, notes: 'Hinge forward, upper arm still, extend fully.' }),
      ex('pu6', 'Pike push-ups', { repMin: 6, repMax: 8, notes: 'Hips high, lower head toward floor. Shoulder focus.' }),
      timed('pu7', 'Plank', 30, 'Straight line head to heels.')
    ],
    warmup: [
      { id: 'puw1', name: 'Arm circles', duration: 30 },
      { id: 'puw2', name: 'Wall push-ups', duration: 30 },
      { id: 'puw3', name: 'Shoulder rolls', duration: 30 }
    ],
    cooldown: [
      { id: 'puc1', name: 'Chest doorway stretch', duration: 30 },
      { id: 'puc2', name: 'Overhead triceps stretch', duration: 30 },
      { id: 'puc3', name: 'Cross-body shoulder stretch', duration: 30 }
    ]
  }
}

export function pullRoutine(): Routine {
  return {
    id: 'preset-pull',
    name: 'Pull Day',
    exercises: [
      ex('pl1', 'Two-arm bent-over rows', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Flat back, pull elbows to hips.' }),
      ex('pl2', 'Single-arm rows', { repMin: 12, repMax: 15, weight: 4, notes: 'Reps per arm. Free hand on knee or chair.' }),
      ex('pl3', 'Reverse flyes', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Bent over, lead with elbows, squeeze shoulder blades.' }),
      ex('pl4', 'Biceps curls', { sets: 3, repMin: 12, repMax: 15, weight: 4, notes: 'Elbows pinned to sides, slow lower.' }),
      ex('pl5', 'Hammer curls', { repMin: 12, repMax: 15, weight: 4, notes: 'Palms face each other.' }),
      ex('pl6', 'Shrugs', { repMin: 15, repMax: 20, weight: 4, notes: 'Straight up to ears, hold 1 s.' }),
      timed('pl7', 'Superman hold', 20, 'Face down, lift arms and legs, squeeze upper back.')
    ],
    warmup: [
      { id: 'plw1', name: 'Arm pull-aparts', duration: 30 },
      { id: 'plw2', name: 'Cat-cow', duration: 30 },
      { id: 'plw3', name: 'Shoulder rolls', duration: 30 }
    ],
    cooldown: [
      { id: 'plc1', name: "Child's pose", duration: 30 },
      { id: 'plc2', name: 'Biceps wall stretch', duration: 30 },
      { id: 'plc3', name: 'Upper back hug stretch', duration: 30 }
    ]
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
    warmup: [
      { id: 'fbw1', name: 'Jumping jacks', duration: 45 },
      { id: 'fbw2', name: 'Arm circles', duration: 30 }
    ],
    cooldown: [
      { id: 'fbc1', name: 'Forward fold', duration: 30 },
      { id: 'fbc2', name: 'Chest doorway stretch', duration: 30 }
    ]
  }
}

/** Built-in routines, in display order. Used for fresh installs, migration and "reset to default". */
export const PRESETS: Record<string, () => Routine> = {
  [SEED_ID]: seedRoutine,
  'preset-lower-core': lowerBodyRoutine,
  'preset-push': pushRoutine,
  'preset-pull': pullRoutine,
  'preset-full-body': fullBodyRoutine
}
export const PRESET_VERSION = 2

/** One-time add of presets introduced after a user's data was created. Deleted presets stay deleted. */
export function withPresets(d: AppData): AppData {
  const v = d.presets ?? 0
  if (v >= PRESET_VERSION) return d
  let routines = d.routines
  if (v < 1) {
    const have = new Set(routines.map((r) => r.id))
    const missing = Object.entries(PRESETS)
      .filter(([id]) => id !== SEED_ID && !have.has(id))
      .map(([, make]) => make())
    routines = [...routines, ...missing]
  }
  if (v < 2) {
    // v2: Full Body Express used 30 s rests; breaks now default to the 1-minute setting
    routines = routines.map((r) =>
      r.id === 'preset-full-body' ? { ...r, exercises: r.exercises.map((e) => (e.id.startsWith('fb') && e.rest === 30 ? { ...e, rest: null } : e)) } : r
    )
  }
  return { ...d, routines, presets: PRESET_VERSION }
}

export const defaultSettings = (): Settings => ({
  sound: true,
  vibration: true,
  defaultRest: 60,
  getReady: 5,
  units: 'kg',
  weeklyGoal: 3,
  theme: 'light',
  useWarmup: false,
  useCooldown: false,
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
