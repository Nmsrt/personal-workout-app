import { useMemo, useState } from 'react'
import { Calendar } from '../components/Calendar'
import { Icon } from '../components/Icon'
import { useStore } from '../store'
import { dayKey, fmtDuration, toDisp } from '../util'

export function History() {
  const { data, update } = useStore()
  const [sel, setSel] = useState<string | null>(null)
  const marked = useMemo(() => new Set(data.history.map((w) => dayKey(w.start))), [data.history])
  const list = [...data.history].sort((a, b) => b.start - a.start).filter((w) => !sel || dayKey(w.start) === sel)
  const u = data.settings.units
  const totalTime = data.history.reduce((a, w) => a + (w.end - w.start), 0)

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <span className="label">
            {data.history.length} session{data.history.length === 1 ? '' : 's'} · {fmtDuration(totalTime)}
          </span>
          <h1 className="display">History</h1>
        </div>
      </header>
      <Calendar marked={marked} selected={sel} onSelect={(k) => setSel(sel === k ? null : k)} />

      <div>
        <div className="section-head">
          <span className="label">{sel ? new Date(sel + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'All sessions'}</span>
          {sel && (
            <button className="text-btn small" style={{ minHeight: 0, padding: 0 }} onClick={() => setSel(null)}>
              Show all
            </button>
          )}
        </div>
        {list.length === 0 && (
          <div className="group empty">
            <Icon name="calendar" size={36} />
            <strong>{sel ? 'Rest day' : 'No workouts yet'}</strong>
            {sel ? 'Nothing logged on this day.' : 'Finished sessions will show up here.'}
          </div>
        )}
        {list.map((w) => {
          const d = new Date(w.start)
          return (
            <details key={w.id} className="hist">
              <summary>
                <div className="date">
                  <b>{d.getDate()}</b>
                  <span>{d.toLocaleDateString(undefined, { month: 'short' })}</span>
                </div>
                <div className="grow">
                  <strong>{w.routineName}</strong>
                  <div className="muted small" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {fmtDuration(w.end - w.start)} · {w.exercises.reduce((a, e) => a + e.sets.length, 0)} sets
                  </div>
                </div>
                {w.prs.length > 0 && (
                  <span className="tag" style={{ color: 'var(--gold)' }}>
                    <Icon name="trophy" size={12} /> {w.prs.length}
                  </span>
                )}
                <span className="chev">
                  <Icon name="chevR" size={18} />
                </span>
              </summary>
              <div className="hist-body">
                {w.exercises.map((e) => (
                  <div key={e.exerciseId} className="sum-row">
                    <span>
                      {e.name}
                      {w.prs.includes(e.name) && (
                        <span className="tag" style={{ color: 'var(--gold)' }}>
                          PR
                        </span>
                      )}
                    </span>
                    <span className="mono">{e.sets.map((x) => (e.type === 'timed' ? `${x.duration}s` : `${x.reps}${x.weight ? `×${toDisp(x.weight, u)}` : ''}`)).join(' · ')}</span>
                  </div>
                ))}
                <button className="text-btn danger small" onClick={() => confirm('Delete this workout from history?') && update((dd) => ({ ...dd, history: dd.history.filter((x) => x.id !== w.id) }))}>
                  <Icon name="trash" size={16} /> Delete session
                </button>
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
