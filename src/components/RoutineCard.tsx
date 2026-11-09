import { estimateMin, formatDays } from '../logic'
import type { Routine, Settings, Workout } from '../types'
import { Icon } from './Icon'

function lastDoneLabel(history: Workout[], routineId: string): string {
  let last: Workout | undefined
  for (const w of history) if (w.routineId === routineId && (!last || w.start > last.start)) last = w
  return last ? `Last done ${new Date(last.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Not done yet'
}

const plural = (n: number, w: string) => `${w}${n === 1 ? '' : 's'}`

interface Props {
  r: Routine
  active: boolean
  settings: Settings
  history: Workout[]
  onClick: () => void
}

export function RoutineCard({ r, active, settings, history, onClick }: Props) {
  const sets = r.exercises.reduce((a, e) => a + e.sets, 0)
  const when = formatDays(r.days)
  return (
    <div className={`routine-card${active ? ' active' : ''}`}>
      <button className="rc-btn" onClick={onClick} aria-label={`Open ${r.name}`}>
        <div className="rc-top">
          <span className="rc-name">{r.name || 'Untitled'}</span>
          {active && <span className="tag rc-active">Active</span>}
        </div>
        <div className="rc-meta">
          <span>
            <b>{r.exercises.length}</b> {plural(r.exercises.length, 'exercise')}
          </span>
          <span>
            <b>{sets}</b> {plural(sets, 'set')}
          </span>
          <span>
            ~<b>{estimateMin(r, settings)}</b> min
          </span>
        </div>
        <div className="rc-foot">
          <span className="muted small">
            {when ? `${when} · ` : ''}
            {lastDoneLabel(history, r.id)}
          </span>
          <span className="rc-chev">
            <Icon name="chevR" size={18} />
          </span>
        </div>
      </button>
    </div>
  )
}
