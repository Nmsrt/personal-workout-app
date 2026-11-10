import { DAY_LETTERS, DAY_NAMES, estimateMin, formatDays } from '../logic'
import type { Routine, Settings, Workout } from '../types'
import { MUSCLE_LABELS, routineMuscles } from '../muscles'
import { Icon } from './Icon'
import { MuscleMap } from './MuscleMap'

function lastDone(history: Workout[], routineId: string): Workout | undefined {
  let last: Workout | undefined
  for (const w of history) if (w.routineId === routineId && (!last || w.start > last.start)) last = w
  return last
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
  const when = formatDays(r.days)
  const last = lastDone(history, r.id)
  const muscles = routineMuscles(r)
  const focus = muscles.ranked.filter((m) => muscles.tiers[m]! >= 2).slice(0, 3).map((m) => MUSCLE_LABELS[m])
  return (
    <div className={`routine-card${active ? ' active' : ''}`}>
      <button className="rc-btn" onClick={onClick} aria-label={`Open ${r.name}`}>
        <div className="rc-main">
          <div className="rc-info">
            <div className="rc-top">
              <span className="rc-name">{r.name || 'Untitled'}</span>
              {active && <span className="tag rc-active">Active</span>}
            </div>
            <div className="rc-meta">
              <span>
                <b>{r.exercises.length}</b> {plural(r.exercises.length, 'exercise')}
              </span>
              <span>
                ~<b>{estimateMin(r, settings)}</b> min
              </span>
            </div>
            {focus.length > 0 && <div className="rc-focus">{focus.join(' · ')}</div>}
          </div>
          {muscles.ranked.length > 0 && <MuscleMap summary={muscles} />}
        </div>
        <div className="rc-foot">
          {r.days?.length ? (
            <span className="rc-days" role="img" aria-label={`Planned: ${when}`}>
              {r.days.map((i) => (
                <span key={i} title={DAY_NAMES[i]}>
                  {DAY_LETTERS[i]}
                </span>
              ))}
            </span>
          ) : (
            <span className="rc-nodays">No days planned</span>
          )}
          <span className={`rc-last${last ? '' : ' never'}`}>
            <Icon name="clock" size={14} />
            {last ? new Date(last.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Not done yet'}
          </span>
          <span className="rc-chev">
            <Icon name="chevR" size={18} />
          </span>
        </div>
      </button>
    </div>
  )
}
