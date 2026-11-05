interface Props {
  points: { t: number; y: number }[]
  label: string
  unit?: string
}

export function LineChart({ points, label, unit = '' }: Props) {
  const W = 340
  const H = 150
  const P = { l: 30, r: 8, t: 10, b: 22 }
  if (points.length === 0) return null
  const ys = points.map((p) => p.y)
  let lo = Math.min(...ys)
  let hi = Math.max(...ys)
  if (hi === lo) {
    lo = Math.max(0, lo - 1)
    hi = hi + 1
  }
  const x = (i: number) => (points.length === 1 ? (P.l + W - P.r) / 2 : P.l + (i / (points.length - 1)) * (W - P.l - P.r))
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - P.b} L${x(0).toFixed(1)},${H - P.b} Z`
  const fmt = (v: number) => (Math.round(v * 10) / 10).toString()
  const dateFmt = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const last = points[points.length - 1]

  return (
    <figure className="chart">
      <figcaption>
        <strong>{label}</strong>
        <span className="mono">
          {fmt(last.y)}
          {unit}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} over time, latest ${fmt(last.y)}${unit}`}>
        {[lo, (lo + hi) / 2, hi].map((v, i) => (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={P.l - 8} y={y(v) + 3.5} textAnchor="end" className="axis">
              {fmt(v)}
            </text>
          </g>
        ))}
        {points.length > 1 && <path d={area} className="area" />}
        <path d={line} className="line" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.y)} r={i === points.length - 1 ? 5 : 3.5} className={i === points.length - 1 ? 'dot last' : 'dot'}>
            <title>{`${dateFmt(p.t)}: ${fmt(p.y)}${unit}`}</title>
          </circle>
        ))}
        <text x={P.l} y={H - 4} className="axis">
          {dateFmt(points[0].t)}
        </text>
        {points.length > 1 && (
          <text x={W - P.r} y={H - 4} textAnchor="end" className="axis">
            {dateFmt(last.t)}
          </text>
        )}
      </svg>
    </figure>
  )
}
