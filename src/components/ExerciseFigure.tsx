import { useEffect, useMemo, useState } from 'react'
import { ANIMS } from '../figures/anims'
import { cycle, prepare, type Joints, type V } from '../figures/rig'

const prepCache = new Map<string, ReturnType<typeof prepare>>()
function prep(key: string) {
  let p = prepCache.get(key)
  if (!p) {
    p = prepare(ANIMS[key])
    prepCache.set(key, p)
  }
  return p
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Props {
  anim: string
  /** draw dumbbells (when the animation uses them) */
  dumbbells?: boolean
  animate?: boolean
  className?: string
  title?: string
  /** render a fixed point of the cycle (0 = start pose, 1 = end pose) */
  at?: number
}

export function ExerciseFigure({ anim, dumbbells = true, animate = true, className = '', title, at }: Props) {
  const p = useMemo(() => prep(ANIMS[anim] ? anim : 'stand'), [anim])
  const still = at !== undefined || !animate || reducedMotion()
  const [t, setT] = useState(still ? (at ?? 1) : 0)

  useEffect(() => {
    if (still) {
      setT(at ?? 1)
      return
    }
    const period = p.anim.hold ? 4000 : 3200
    let raf = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      setT(cycle((now - t0) / period))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [p, still, at])

  const [x, y, w, h] = p.viewBox
  const showDb = dumbbells && p.anim.db !== 'none'
  return (
    <div className={`figure-box ${className}`}>
    <svg className="figure" viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMax meet" role="img" aria-label={title ?? `${p.anim.label} demonstration`}>
      <line className="fig-floor" x1={x + 4} x2={x + w - 4} y1={1.5} y2={1.5} />
      {p.anim.wall && <WallLine j={p.frame(0)} top={y} />}
      {animate && at === undefined && still && !p.anim.hold && <Body j={p.frame(0)} rig={p.anim.rig} db={showDb ? p.anim.db : 'none'} ghost />}
      <Body j={p.frame(t)} rig={p.anim.rig} db={showDb ? p.anim.db : 'none'} />
    </svg>
    </div>
  )
}

function WallLine({ j, top }: { j: Joints; top: number }) {
  const x = Math.min(j.hip[0], j.sh[0]) - 12
  return <line className="fig-wall" x1={x} x2={x} y1={1.5} y2={top + 4} />
}

const seg = (a: V, b: V, w: number, cls: string, key: string) => <line key={key} className={cls} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={w} />
const poly = (pts: V[], w: number, cls: string, key: string) => <polyline key={key} className={cls} points={pts.map((p) => p.join(',')).join(' ')} strokeWidth={w} />

function Dumbbell({ at, cls }: { at: V; cls: string }) {
  return <circle className={`fig-db ${cls}`} cx={at[0]} cy={at[1]} r={6.5} />
}

function Goblet({ a, b }: { a: V; b: V }) {
  const cx = (a[0] + b[0]) / 2 + 3
  const cy = (a[1] + b[1]) / 2
  return (
    <g className="fig-goblet">
      <line x1={cx} x2={cx} y1={cy - 11} y2={cy + 11} strokeWidth={3.5} />
      <rect x={cx - 6.5} y={cy - 15} width={13} height={6} rx={2} />
      <rect x={cx - 6.5} y={cy + 9} width={13} height={6} rx={2} />
    </g>
  )
}

function Body({ j, rig, db, ghost }: { j: Joints; rig: 'side' | 'front'; db: string; ghost?: boolean }) {
  const n = 'fig-near'
  const f = 'fig-far'
  if (rig === 'front') {
    return (
      <g className={ghost ? 'fig-ghost' : undefined}>
        {poly([j.hipL, j.knL, j.anL, j.toL], 12, n, 'lL')}
        {poly([j.hipR, j.knR, j.anR, j.toR], 12, n, 'lR')}
        <polygon className="fig-torso" points={[j.shL, j.shR, j.hipR, j.hipL].map((p) => p.join(',')).join(' ')} />
        {seg(j.neck, [j.neck[0], j.shL[1]], 9, n, 'nk')}
        <circle className="fig-head" cx={j.head[0]} cy={j.head[1]} r={10.5} />
        {poly([j.shL, j.elL, j.haL], 9, n, 'aL')}
        {poly([j.shR, j.elR, j.haR], 9, n, 'aR')}
        {db === 'hands' && (
          <>
            <Dumbbell at={j.haL} cls="" />
            <Dumbbell at={j.haR} cls="" />
          </>
        )}
      </g>
    )
  }
  return (
    <g className={ghost ? 'fig-ghost' : undefined}>
      {poly([j.sh, j.elF, j.haF], 8.5, f, 'aF')}
      {(db === 'hands') && <Dumbbell at={j.haF} cls="far" />}
      {poly([j.hip, j.knF, j.anF, j.toF], 12, f, 'lF')}
      {seg(j.hip, j.sh, 19, n, 'torso')}
      {seg(j.sh, j.neck, 9, n, 'neck')}
      <circle className="fig-head" cx={j.head[0]} cy={j.head[1]} r={10.5} />
      {poly([j.hip, j.knN, j.anN, j.toN], 12.5, n, 'lN')}
      {db === 'goblet' && <Goblet a={j.haN} b={j.haF} />}
      {poly([j.sh, j.elN, j.haN], 9, n, 'aN')}
      {(db === 'hands' || db === 'near') && <Dumbbell at={j.haN} cls="" />}
    </g>
  )
}
