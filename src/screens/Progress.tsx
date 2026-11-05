import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { LineChart } from '../components/LineChart'
import { exerciseSeries } from '../logic'
import { useStore } from '../store'
import { toDisp } from '../util'

export function Progress() {
  const { data } = useStore()
  const series = useMemo(() => exerciseSeries(data.history), [data.history])
  const [id, setId] = useState<string | null>(null)
  const u = data.settings.units
  const cur = series.find((s) => s.id === id) ?? series[0]

  const header = (
    <header className="topbar">
      <div>
        <span className="label">Charts & records</span>
        <h1 className="display">Progress</h1>
      </div>
    </header>
  )

  if (!series.length) {
    return (
      <div className="screen">
        {header}
        <div className="group empty">
          <Icon name="chart" size={36} />
          <strong>No data yet</strong>
          Finish a workout to see charts and personal records.
        </div>
      </div>
    )
  }

  const prText = (s: (typeof series)[number]) =>
    !s.pr ? '-' : s.type === 'timed' ? `${s.pr.set.duration}s` : `${s.pr.set.reps}${s.pr.set.weight ? ` × ${toDisp(s.pr.set.weight, u)}${u}` : ' reps'}`
  const hasWeight = cur.points.some((p) => p.topWeight > 0)
  const lastPt = cur.points[cur.points.length - 1]

  return (
    <div className="screen">
      {header}
      <div className="routine-picker" role="tablist" aria-label="Exercise">
        {series.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === cur.id} className={`chip${s.id === cur.id ? ' on' : ''}`} onClick={() => setId(s.id)}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="label">Best</span>
          <span className="v">{prText(cur)}</span>
        </div>
        <div className="kpi">
          <span className="label">Sessions</span>
          <span className="v">{cur.points.length}</span>
        </div>
        <div className="kpi">
          <span className="label">Last</span>
          <span className="v">{new Date(lastPt.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      <section className="card">
        {cur.type === 'timed' ? (
          <LineChart label="Longest hold" unit="s" points={cur.points.map((p) => ({ t: p.t, y: p.best }))} />
        ) : (
          <>
            <LineChart label="Total reps" points={cur.points.map((p) => ({ t: p.t, y: p.totalReps }))} />
            {hasWeight && <LineChart label="Top weight" unit={u} points={cur.points.map((p) => ({ t: p.t, y: toDisp(p.topWeight, u) }))} />}
          </>
        )}
      </section>

      <div>
        <div className="section-head">
          <span className="label">Personal records</span>
        </div>
        <div className="group">
          {series.map((s) => (
            <div key={s.id} className="row-item">
              <div className="grow">
                <div className="title">{s.name}</div>
                {s.pr && <div className="sub">{new Date(s.pr.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
              </div>
              <span className="tnum">
                {prText(s)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
