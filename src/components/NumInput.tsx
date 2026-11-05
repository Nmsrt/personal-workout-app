import { useEffect, useState } from 'react'
import { Icon } from './Icon'

interface Props {
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
  allowEmpty?: boolean
  placeholder?: string
  ariaLabel?: string
  decimal?: boolean
  className?: string
  id?: string
}

/** Number field that keeps its own text while typing (so "2." or "" don't get clobbered). */
export function NumInput({ value, onChange, min = 0, max = 9999, allowEmpty, placeholder, ariaLabel, decimal, className = 'num', id }: Props) {
  const [text, setText] = useState(value == null ? '' : String(value))
  useEffect(() => {
    const parsed = text === '' ? null : Number(text)
    if (parsed !== value) setText(value == null ? '' : String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <input
      id={id}
      className={className}
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.')
        if (!/^\d*\.?\d*$/.test(t)) return
        setText(t)
        if (t === '' || t === '.') {
          if (allowEmpty) onChange(null)
          return
        }
        const n = Math.min(max, Math.max(min, Number(t)))
        if (!Number.isNaN(n)) onChange(n)
      }}
      onBlur={() => {
        if (text === '' && !allowEmpty) setText(String(value ?? min))
      }}
    />
  )
}

interface StepperProps {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  label: string
  unit?: string
  decimal?: boolean
}

export function Stepper({ value, onChange, step = 1, min = 0, label, unit, decimal }: StepperProps) {
  const round = (n: number) => Math.round(n * 10) / 10
  return (
    <div className="stepper">
      <span className="stepper-label">
        {label}
        {unit && ` · ${unit}`}
      </span>
      <div className="stepper-val">
        <NumInput value={value} onChange={(v) => onChange(v ?? min)} min={min} decimal={decimal} ariaLabel={label} />
      </div>
      <div className="stepper-row">
        <button type="button" className="btn" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, round(value - step)))}>
          <Icon name="minus" size={20} stroke={2.2} />
        </button>
        <button type="button" className="btn" aria-label={`Increase ${label}`} onClick={() => onChange(round(value + step))}>
          <Icon name="plus" size={20} stroke={2.2} />
        </button>
      </div>
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
    </span>
  )
}
