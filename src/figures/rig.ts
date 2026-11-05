/**
 * Tiny forward-kinematics rig for exercise silhouettes.
 *
 * Angles are absolute, in degrees: 0 = pointing down, 90 = pointing right
 * (the way the figure faces), 180 = up, -90 = left. Limb lengths are fixed,
 * so interpolating angles between a start and end pose gives natural arcs.
 */

export type V = [number, number]
export type Params = Record<string, number>
export type Joints = Record<string, V>

export interface Anim {
  label: string
  rig: 'side' | 'front'
  a: Params
  b: Params
  /** joint that stays fixed between frames (planted foot, hands on floor…) */
  anchor: string
  db: 'hands' | 'near' | 'goblet' | 'none'
  wall?: boolean
  /** near-static hold: slower, subtle cycle */
  hold?: boolean
}

const RAD = Math.PI / 180
const dir = (a: number): V => [Math.sin(a * RAD), Math.cos(a * RAD)]
const add = (p: V, v: V, l: number): V => [p[0] + v[0] * l, p[1] + v[1] * l]

export const LEN = { shoulder: 36, neck: 41, head: 12, ua: 25, fa: 23, th: 33, shin: 31, foot: 11 }

/* ───────── Side view ───────── */

const STAND: Params = { torso: 180, head: 0, uaN: 4, faN: 4, thN: 0, shN: 0, ftN: 90 }

/** Fill a side pose: unspecified far limbs mirror near ones (arms nudged forward for depth). */
export function S(p: Params): Params {
  const n = { ...STAND, ...p }
  return { uaF: n.uaN + 5, faF: n.faN + 5, thF: n.thN, shF: n.shN, ftF: n.ftN, ...n }
}

function sideJoints(p: Params): Joints {
  const hip: V = [0, 0]
  const t = dir(p.torso)
  const sh = add(hip, t, LEN.shoulder)
  const neck = add(hip, t, LEN.neck)
  const head = add(neck, dir(p.torso + p.head), LEN.head)
  const elN = add(sh, dir(p.uaN), LEN.ua)
  const haN = add(elN, dir(p.faN), LEN.fa)
  const elF = add(sh, dir(p.uaF), LEN.ua)
  const haF = add(elF, dir(p.faF), LEN.fa)
  const knN = add(hip, dir(p.thN), LEN.th)
  const anN = add(knN, dir(p.shN), LEN.shin)
  const toN = add(anN, dir(p.ftN), LEN.foot)
  const knF = add(hip, dir(p.thF), LEN.th)
  const anF = add(knF, dir(p.shF), LEN.shin)
  const toF = add(anF, dir(p.ftF), LEN.foot)
  return { hip, sh, neck, head, elN, haN, elF, haF, knN, anN, toN, knF, anF, toF }
}

/* ───────── Front view ───────── */

export function F(p: Params): Params {
  return { armL: 6, foreL: 6, armR: 6, foreR: 6, lift: 0, torsoLen: 40, headDrop: 0, ...p }
}

function frontJoints(p: Params): Joints {
  const tl = p.torsoLen
  const hipL: V = [-9, 0]
  const hipR: V = [9, 0]
  const shY = -tl + 4 - p.lift
  const shL: V = [-16, shY]
  const shR: V = [16, shY]
  const neck: V = [0, -tl - p.lift * 0.4]
  const head: V = [0, -tl - 12 - p.lift * 0.3 + p.headDrop]
  const elL = add(shL, dir(-p.armL), LEN.ua)
  const haL = add(elL, dir(-p.foreL), LEN.fa)
  const elR = add(shR, dir(p.armR), LEN.ua)
  const haR = add(elR, dir(p.foreR), LEN.fa)
  const knL = add(hipL, dir(-3), LEN.th)
  const anL = add(knL, dir(0), LEN.shin)
  const toL = add(anL, dir(-90), 7)
  const knR = add(hipR, dir(3), LEN.th)
  const anR = add(knR, dir(0), LEN.shin)
  const toR = add(anR, dir(90), 7)
  return { head, neck, shL, shR, elL, haL, elR, haR, hipL, hipR, knL, anL, toL, knR, anR, toR }
}

/* ───────── Frames ───────── */

const lerpParams = (a: Params, b: Params, t: number): Params => {
  const out: Params = {}
  for (const k of Object.keys(a)) out[k] = a[k] + ((b[k] ?? a[k]) - a[k]) * t
  return out
}

const radius = (k: string) => (k === 'head' ? 11 : 6)

export interface Prepared {
  anim: Anim
  frame: (t: number) => Joints
  viewBox: [number, number, number, number]
  floorY: number
}

/** Ground pose A on the floor (y = 0), pin the anchor joint, and fit a viewBox around both poses. */
export function prepare(anim: Anim): Prepared {
  const joints = anim.rig === 'side' ? sideJoints : frontJoints
  const A = joints(anim.a)
  const bottomA = Math.max(...Object.entries(A).map(([k, p]) => p[1] + radius(k)))
  const anchorPos: V = [A[anim.anchor][0], A[anim.anchor][1] - bottomA]

  const frame = (t: number): Joints => {
    const j = joints(lerpParams(anim.a, anim.b, t))
    const dx = anchorPos[0] - j[anim.anchor][0]
    const dy = anchorPos[1] - j[anim.anchor][1]
    const out: Joints = {}
    for (const [k, p] of Object.entries(j)) out[k] = [p[0] + dx, p[1] + dy]
    return out
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity
  for (const t of [0, 0.5, 1]) {
    for (const [k, p] of Object.entries(frame(t))) {
      const r = radius(k)
      minX = Math.min(minX, p[0] - r)
      maxX = Math.max(maxX, p[0] + r)
      minY = Math.min(minY, p[1] - r)
    }
  }
  const pad = 10
  const w = Math.max(maxX - minX + pad * 2, 90)
  const cx = (minX + maxX) / 2
  const top = minY - pad
  const h = Math.max(0 - top + 6, 70)
  return { anim, frame, viewBox: [cx - w / 2, -h + 6, w, h], floorY: 0 }
}

/** 0→hold A→move→hold B→move back, eased. */
export function cycle(u: number): number {
  const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x)
  u = u - Math.floor(u)
  if (u < 0.15) return 0
  if (u < 0.5) return ease((u - 0.15) / 0.35)
  if (u < 0.65) return 1
  return ease(1 - (u - 0.65) / 0.35)
}
