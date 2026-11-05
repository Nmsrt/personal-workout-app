import type { ReactNode } from 'react'
import { estimateMin } from '../logic'
import type { Routine, Settings, Workout } from '../types'
import { Icon } from './Icon'

export function lastDoneLabel(history: Workout[], routineId: string): string {
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
  /** undefined = navigates; boolean = expands in place */
  expanded?: boolean
  children?: ReactNode
}

export function RoutineCard({ r, active, settings, history, onClick, expanded, children }: Props) {
  const sets = r.exercises.reduce((a, e) => a + e.sets, 0)
  const expandable = expanded !== undefined
  return (
    <div className={`routine-card${active ? ' active' : ''}${expanded ? ' expanded' : ''}`}>
      <button className="rc-btn" onClick={onClick} aria-expanded={expandable ? expanded : undefined} aria-label={`${expandable ? (expanded ? 'Collapse' : 'Expand') : 'Open'} ${r.name}`}>
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
          <span className="muted small">{lastDoneLabel(history, r.id)}</span>
          <span className="rc-chev">
            <Icon name="chevR" size={18} />
          </span>
        </div>
      </button>
      {expanded && <div className="rc-body">{children}</div>}
    </div>
  )
}
