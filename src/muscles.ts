import { animFor } from './figures/anims'
import type { Exercise, Routine } from './types'

export type Muscle =
  | 'chest'
  | 'shoulders'
  | 'rearDelts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'traps'
  | 'upperBack'
  | 'lowerBack'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  rearDelts: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  traps: 'Traps',
  upperBack: 'Upper back',
  lowerBack: 'Lower back',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves'
}

/** 3 = main mover, 2 = strong helper, 1 = stabiliser */
type Load = Partial<Record<Muscle, number>>

const BY_ANIM: Record<string, Load> = {
  squat: { quads: 3, glutes: 2, hamstrings: 1, abs: 1 },
  lunge: { quads: 3, glutes: 3, hamstrings: 1, calves: 1 },
  rdl: { hamstrings: 3, glutes: 3, lowerBack: 2 },
  wallsit: { quads: 3, glutes: 1 },
  calf: { calves: 3 },
  bridge: { glutes: 3, hamstrings: 2, lowerBack: 1 },
  pushup: { chest: 3, triceps: 2, shoulders: 2, abs: 1 },
  pike: { shoulders: 3, triceps: 2, traps: 1 },
  climber: { abs: 3, obliques: 1, shoulders: 1, quads: 1 },
  plank: { abs: 3, obliques: 2, shoulders: 1 },
  sideplank: { obliques: 3, abs: 2, shoulders: 1, glutes: 1 },
  deadbug: { abs: 3, obliques: 1 },
  superman: { lowerBack: 3, glutes: 2, upperBack: 1, hamstrings: 1 },
  row: { upperBack: 3, rearDelts: 2, biceps: 2, traps: 1 },
  row1: { upperBack: 3, rearDelts: 2, biceps: 2, traps: 1 },
  revfly: { rearDelts: 3, upperBack: 2, traps: 1 },
  kickback: { triceps: 3 },
  ohp: { shoulders: 3, triceps: 2, traps: 1 },
  lateral: { shoulders: 3, traps: 1 },
  shrug: { traps: 3 },
  curl: { biceps: 3, forearms: 1 },
  floorpress: { chest: 3, triceps: 2, shoulders: 1 }
}

/** Names whose muscles differ from the illustration they share (checked first). */
const BY_NAME: [RegExp, Load][] = [
  [/tricep|skull ?crusher/i, { triceps: 3 }],
  [/hammer/i, { biceps: 3, forearms: 2 }],
  [/close[- ]grip|diamond/i, { triceps: 3, chest: 2, shoulders: 1 }],
  [/leg raise/i, { abs: 3 }]
]

/** Muscles one exercise works. Explicit illustration wins over name rules, as it is the user's choice. */
export function musclesFor(ex: Pick<Exercise, 'name' | 'illustration'>): Load {
  if (!ex.illustration || ex.illustration === 'none') {
    for (const [re, load] of BY_NAME) if (re.test(ex.name)) return load
  }
  const key = ex.illustration === 'none' ? animFor({ name: ex.name }) : animFor(ex)
  return (key && BY_ANIM[key]) || {}
}

export type Tier = 1 | 2 | 3

export interface MuscleSummary {
  /** intensity tier per worked muscle, relative to the routine's most worked muscle */
  tiers: Partial<Record<Muscle, Tier>>
  /** worked muscles, most worked first */
  ranked: Muscle[]
}

/** How hard a routine works each muscle, weighting each exercise by its set count. */
export function routineMuscles(r: Pick<Routine, 'exercises'>): MuscleSummary {
  const score: Partial<Record<Muscle, number>> = {}
  for (const ex of r.exercises) {
    const sets = Math.max(1, ex.sets || 1)
    for (const [m, v] of Object.entries(musclesFor(ex)) as [Muscle, number][]) score[m] = (score[m] ?? 0) + v * sets
  }
  const ranked = (Object.keys(score) as Muscle[]).sort((a, b) => score[b]! - score[a]!)
  const top = ranked.length ? score[ranked[0]]! : 0
  const tiers: MuscleSummary['tiers'] = {}
  for (const m of ranked) {
    const f = score[m]! / top
    tiers[m] = f >= 0.6 ? 3 : f >= 0.3 ? 2 : 1
  }
  return { tiers, ranked }
}
