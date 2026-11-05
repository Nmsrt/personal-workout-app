import { useState } from 'react'
import { dayKey } from '../util'
import { Icon } from './Icon'

interface Props {
  marked: Set<string>
  selected: string | null
  onSelect: (key: string) => void
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function Calendar({ marked, selected, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const today = dayKey(Date.now())
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const count = cells.filter((n) => n != null && marked.has(dayKey(new Date(year, month, n).getTime()))).length

  return (
    <div className="card">
      <div className="cal-head">
        <div>
          <strong>{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <div className="muted small">
            {count} workout{count === 1 ? '' : 's'}
          </div>
        </div>
        <div className="btn-row">
          <button className="btn" aria-label="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <Icon name="chevL" size={18} />
          </button>
          <button className="btn" aria-label="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <Icon name="chevR" size={18} />
          </button>
        </div>
      </div>
      <div className="cal-grid">
        {DOW.map((d, i) => (
          <div key={i} className="cal-dow">
            {d}
          </div>
        ))}
        {cells.map((n, i) => {
          if (n == null) return <div key={i} />
          const key = dayKey(new Date(year, month, n).getTime())
          const cls = ['cal-day', marked.has(key) && 'marked', key === today && 'today', key === selected && 'sel'].filter(Boolean).join(' ')
          return (
            <button key={i} className={cls} onClick={() => onSelect(key)} aria-pressed={key === selected} aria-label={`${key}${marked.has(key) ? ', workout' : ''}`}>
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
