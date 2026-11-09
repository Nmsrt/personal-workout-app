import { DAY_LETTERS, DAY_NAMES } from '../logic'

/** Seven toggle buttons, Monday first. `value` holds weekday indexes (0 = Monday). */
export function DayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const on = new Set(value)
  // The store dedupes and sorts on save.
  const toggle = (d: number) => onChange(on.has(d) ? value.filter((x) => x !== d) : [...value, d])
  return (
    <div className="day-picker" role="group" aria-label="Planned days">
      {DAY_LETTERS.map((l, d) => (
        <button key={d} type="button" className={on.has(d) ? 'on' : ''} aria-pressed={on.has(d)} aria-label={DAY_NAMES[d]} onClick={() => toggle(d)}>
          {l}
        </button>
      ))}
    </div>
  )
}
