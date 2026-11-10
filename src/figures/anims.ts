import { F, S, type Anim } from './rig'

const pushTop = S({ torso: 112, uaN: 0, faN: 0, uaF: 4, faF: 4, thN: -68, shN: -68, ftN: 10 })
const pushLow = S({ torso: 95.3, uaN: -60, faN: 71, uaF: -56, faF: 75, thN: -84.7, shN: -84.7, ftN: 6 })
const hinge = { torso: 105, thN: 20, shN: -10 }
const lyingKneesUp = { torso: -90, thN: 150, shN: 10, ftN: 90 }

export const ANIMS: Record<string, Anim> = {
  squat: {
    label: 'Squat',
    rig: 'side',
    a: S({ uaN: 25, faN: 160 }),
    b: S({ torso: 148, head: 22, thN: 82, shN: -22, uaN: 40, faN: 160 }),
    anchor: 'anN',
    db: 'goblet'
  },
  lunge: {
    label: 'Lunge',
    rig: 'side',
    a: S({ uaN: 3, faN: 3 }),
    b: S({ uaN: 3, faN: 3, thN: 85, shN: 0, thF: -20, shF: -95, ftF: 30 }),
    anchor: 'anN',
    db: 'hands'
  },
  rdl: {
    label: 'Hip hinge (RDL)',
    rig: 'side',
    a: S({ uaN: 2, faN: 2 }),
    b: S({ torso: 100, thN: 10, shN: -8, uaN: 2, faN: 2 }),
    anchor: 'anN',
    db: 'hands'
  },
  wallsit: {
    label: 'Wall sit',
    rig: 'side',
    a: S({ thN: 90, shN: 0, uaN: 25, faN: 70 }),
    b: S({ thN: 90, shN: 0, uaN: 25, faN: 72 }),
    anchor: 'anN',
    db: 'none',
    wall: true,
    hold: true
  },
  calf: {
    label: 'Calf raise',
    rig: 'side',
    a: S({ uaN: 2, faN: 2, ftN: 90 }),
    b: S({ uaN: 2, faN: 2, ftN: 40 }),
    anchor: 'toN',
    db: 'hands'
  },
  bridge: {
    label: 'Glute bridge',
    rig: 'side',
    a: S({ ...lyingKneesUp, uaN: 95, faN: 95 }),
    b: S({ torso: -52, head: -38, thN: 102, shN: -5, ftN: 90, uaN: 95, faN: 95 }),
    anchor: 'sh',
    db: 'none'
  },
  pushup: { label: 'Push-up', rig: 'side', a: pushTop, b: pushLow, anchor: 'haN', db: 'none' },
  pike: {
    label: 'Pike push-up',
    rig: 'side',
    a: S({ torso: 40, uaN: 40, faN: 40, thN: -20, shN: -20 }),
    b: S({ torso: 25, uaN: 80, faN: 10, thN: -30, shN: -30 }),
    anchor: 'haN',
    db: 'none'
  },
  climber: {
    label: 'Mountain climber',
    rig: 'side',
    a: { ...pushTop },
    b: { ...pushTop, thN: 72, shN: -58, ftN: 20 },
    anchor: 'haN',
    db: 'none'
  },
  plank: {
    label: 'Plank',
    rig: 'side',
    a: S({ torso: 100.5, uaN: 0, faN: 90, uaF: 3, faF: 90, thN: -79.5, shN: -79.5, ftN: 10 }),
    b: S({ torso: 101.5, uaN: 0, faN: 90, uaF: 3, faF: 90, thN: -78.5, shN: -78.5, ftN: 10 }),
    anchor: 'elN',
    db: 'none',
    hold: true
  },
  sideplank: {
    label: 'Side plank',
    rig: 'side',
    a: S({ torso: 115.5, uaN: 0, faN: 0, uaF: 180, faF: 180, thN: -64.5, shN: -64.5, ftN: 25 }),
    b: S({ torso: 117.5, uaN: 0, faN: 0, uaF: 180, faF: 180, thN: -62.5, shN: -62.5, ftN: 25 }),
    anchor: 'haN',
    db: 'none',
    hold: true
  },
  deadbug: {
    label: 'Dead bug',
    rig: 'side',
    a: S({ torso: -90, uaN: 180, faN: 180, thN: 180, shN: 90, ftN: 150 }),
    b: S({ torso: -90, uaN: 262, faN: 262, uaF: 185, faF: 185, thN: 180, shN: 90, ftN: 150, thF: 95, shF: 95, ftF: 150 }),
    anchor: 'hip',
    db: 'none'
  },
  superman: {
    label: 'Superman',
    rig: 'side',
    a: S({ torso: 90, uaN: 93, faN: 93, thN: -90, shN: -90, ftN: -95 }),
    b: S({ torso: 103, head: 5, uaN: 110, faN: 112, thN: -102, shN: -104, ftN: -105 }),
    anchor: 'hip',
    db: 'none'
  },
  row: {
    label: 'Bent-over row',
    rig: 'side',
    a: S({ ...hinge, uaN: 0, faN: 0 }),
    b: S({ ...hinge, uaN: -122, faN: 2 }),
    anchor: 'anN',
    db: 'hands'
  },
  row1: {
    label: 'Single-arm row',
    rig: 'side',
    a: S({ ...hinge, uaN: 0, faN: 0, uaF: 12, faF: 12 }),
    b: S({ ...hinge, uaN: -122, faN: 2, uaF: 12, faF: 12 }),
    anchor: 'anN',
    db: 'near'
  },
  revfly: {
    label: 'Reverse fly',
    rig: 'front',
    a: F({ armL: 4, foreL: 4, armR: 4, foreR: 4, torsoLen: 24, headDrop: 10 }),
    b: F({ armL: 82, foreL: 86, armR: 82, foreR: 86, torsoLen: 24, headDrop: 10 }),
    anchor: 'anL',
    db: 'hands'
  },
  kickback: {
    label: 'Triceps kickback',
    rig: 'side',
    a: S({ torso: 110, thN: 20, shN: -10, uaN: -78, faN: 0 }),
    b: S({ torso: 110, thN: 20, shN: -10, uaN: -78, faN: -80 }),
    anchor: 'anN',
    db: 'hands'
  },
  ohp: {
    label: 'Overhead press',
    rig: 'side',
    a: S({ uaN: 40, faN: 172 }),
    b: S({ uaN: 178, faN: 180 }),
    anchor: 'anN',
    db: 'hands'
  },
  lateral: {
    label: 'Lateral raise',
    rig: 'front',
    a: F({ armL: 8, foreL: 8, armR: 8, foreR: 8 }),
    b: F({ armL: 84, foreL: 88, armR: 84, foreR: 88 }),
    anchor: 'anL',
    db: 'hands'
  },
  shrug: {
    label: 'Shrug',
    rig: 'front',
    a: F({ armL: 4, foreL: 4, armR: 4, foreR: 4, lift: 0 }),
    b: F({ armL: 4, foreL: 4, armR: 4, foreR: 4, lift: 7 }),
    anchor: 'anL',
    db: 'hands'
  },
  curl: {
    label: 'Biceps curl',
    rig: 'side',
    a: S({ uaN: 2, faN: 2 }),
    b: S({ uaN: 12, faN: 155 }),
    anchor: 'anN',
    db: 'hands'
  },
  floorpress: {
    label: 'Floor press',
    rig: 'side',
    a: S({ ...lyingKneesUp, uaN: 95, faN: 180 }),
    b: S({ ...lyingKneesUp, uaN: 178, faN: 180 }),
    anchor: 'sh',
    db: 'hands'
  },
  stand: {
    label: 'Generic',
    rig: 'side',
    a: S({ uaN: 8, faN: 12 }),
    b: S({ uaN: 10, faN: 16 }),
    anchor: 'anN',
    db: 'none',
    hold: true
  }
}

/** Ordered keyword rules: first match wins. */
const RULES: [RegExp, string][] = [
  [/pike/i, 'pike'],
  [/push[- ]?up|press[- ]?up/i, 'pushup'],
  [/mountain|climber/i, 'climber'],
  [/side plank/i, 'sideplank'],
  [/plank/i, 'plank'],
  [/wall sit/i, 'wallsit'],
  [/lunge|split squat/i, 'lunge'],
  [/goblet|squat/i, 'squat'],
  [/romanian|rdl|deadlift|good morning/i, 'rdl'],
  [/bridge|hip thrust/i, 'bridge'],
  [/calf/i, 'calf'],
  [/dead ?bug/i, 'deadbug'],
  [/leg raise/i, 'deadbug'],
  [/floor press|bench press|chest press/i, 'floorpress'],
  // Overhead triceps extensions are pressed overhead, not hinged over like a kickback
  [/overhead/i, 'ohp'],
  [/kickback|tricep/i, 'kickback'],
  [/curl/i, 'curl'],
  [/shrug/i, 'shrug'],
  [/superman/i, 'superman'],
  [/reverse fl|rear delt|reverse fly/i, 'revfly'],
  [/lateral|side raise/i, 'lateral'],
  [/(single|one)[- ]arm row/i, 'row1'],
  [/row/i, 'row'],
  [/overhead|shoulder press|military|press/i, 'ohp']
]

export function detectAnim(name: string): string | null {
  for (const [re, key] of RULES) if (re.test(name)) return key
  return null
}

/** Illustration for an exercise: explicit choice, else detected from name, else generic. null = hidden. */
export function animFor(ex: { name: string; illustration?: string }): string | null {
  if (ex.illustration === 'none') return null
  if (ex.illustration && ANIMS[ex.illustration]) return ex.illustration
  return detectAnim(ex.name) ?? 'stand'
}

export const ANIM_OPTIONS = Object.entries(ANIMS)
  .filter(([k]) => k !== 'stand')
  .map(([k, a]) => ({ key: k, label: a.label }))
  .sort((a, b) => a.label.localeCompare(b.label))
