import { useEffect, useRef, useState } from 'react'
import { ExerciseFigure } from '../components/ExerciseFigure'
import { Icon } from '../components/Icon'
import { DayPicker } from '../components/DayPicker'
import { PageTitle } from '../components/PageTitle'
import { NumInput } from '../components/NumInput'
import { RoutineCard } from '../components/RoutineCard'
import { formatDays } from '../logic'
import { PRESETS } from '../seed'
import { useStore } from '../store'
import type { Exercise, Routine } from '../types'
import { ANIM_OPTIONS, animFor, detectAnim, ANIMS } from '../figures/anims'
import { compressImage, fromDisp, toDisp, uid } from '../util'

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const out = [...arr]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

const isActive = (r: Routine) => (r.days?.length ?? 0) > 0

const newExercise = (): Exercise => ({ id: uid(), name: 'New exercise', type: 'reps', sets: 2, repMin: 8, repMax: 12, weight: 0, duration: 30, rest: null, notes: '' })

/** Routines tab: list of routines first; tapping one opens its contents. */
export function Routines() {
  const { data, update, restorePresets } = useStore()
  const [openRoutine, setOpenRoutine] = useState<string | null>(null)
  const [freshExercise, setFreshExercise] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [openRoutine])

  const detail = openRoutine ? data.routines.find((x) => x.id === openRoutine) : undefined
  if (detail) {
    return (
      <RoutineDetail
        key={detail.id}
        r={detail}
        initialOpen={freshExercise}
        onBack={() => setOpenRoutine(null)}
        onOpen={(id, exId) => {
          setFreshExercise(exId ?? null)
          setOpenRoutine(id)
        }}
      />
    )
  }

  const addRoutine = () => {
    const ex = newExercise()
    const nr: Routine = { id: uid(), name: 'New routine', exercises: [ex] }
    update((d) => ({ ...d, routines: [...d.routines, nr] }))
    setFreshExercise(ex.id)
    setOpenRoutine(nr.id)
  }
  // A routine is active when it is planned for at least one day. Active ones list first.
  const missing = Object.keys(PRESETS).filter((id) => !data.routines.some((x) => x.id === id))
  const sorted = [...data.routines].sort((a, b) => Number(isActive(b)) - Number(isActive(a)))

  return (
    <div className="screen">
      <PageTitle title="Routines" sub={`${data.routines.length} routine${data.routines.length === 1 ? '' : 's'}`} />

      <div className="routine-list">
        {sorted.map((r) => (
          <RoutineCard key={r.id} r={r} active={isActive(r)} settings={data.settings} history={data.history} onClick={() => setOpenRoutine(r.id)} />
        ))}
      </div>

      <button className="btn dashed block" onClick={addRoutine}>
        <Icon name="plus" size={18} /> New routine
      </button>

      {/* Shown while a built-in routine is missing, until dismissed. Deleting another one later shows it again. */}
      {missing.some((id) => !data.restoreDismissed?.includes(id)) && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="text-btn" onClick={restorePresets}>
            <Icon name="reset" size={16} /> Restore built-in routines
          </button>
          <button className="text-btn" aria-label="Hide restore built-in routines" onClick={() => update((d) => ({ ...d, restoreDismissed: missing }))}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

function RoutineDetail({ r, initialOpen, onBack, onOpen }: { r: Routine; initialOpen: string | null; onBack: () => void; onOpen: (id: string, exId?: string) => void }) {
  const { data, update, updateRoutine, resetPreset } = useStore()
  const [openId, setOpenId] = useState<string | null>(initialOpen)
  const active = isActive(r)
  const onlyOne = data.routines.length <= 1
  const [manageOpen, setManageOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the manage menu on a tap outside it or Escape.
  useEffect(() => {
    if (!manageOpen) return
    const away = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setManageOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setManageOpen(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [manageOpen])

  const duplicate = () => {
    const nr: Routine = { ...structuredClone(r), id: uid(), name: `${r.name} (copy)` }
    nr.exercises = nr.exercises.map((e) => ({ ...e, id: uid() }))
    update((d) => ({ ...d, routines: [...d.routines, nr] }))
    onOpen(nr.id)
  }
  const del = () => {
    if (onlyOne) return
    if (!confirm(`Delete routine "${r.name}"? Workout history is kept.`)) return
    const rest = data.routines.filter((x) => x.id !== r.id)
    update((d) => ({ ...d, routines: rest, activeRoutineId: d.activeRoutineId === r.id ? rest[0].id : d.activeRoutineId }))
    onBack()
  }
  const setEx = (exId: string, patch: Partial<Exercise>) => updateRoutine(r.id, (rt) => ({ ...rt, exercises: rt.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) }))
  const addEx = () => {
    const ex = newExercise()
    updateRoutine(r.id, (rt) => ({ ...rt, exercises: [...rt.exercises, ex] }))
    setOpenId(ex.id)
  }

  return (
    <div className="screen">
      <PageTitle
        title={r.name || 'Untitled'}
        sub={`${r.exercises.length} exercise${r.exercises.length === 1 ? '' : 's'}`}
        onBack={onBack}
        backLabel="All routines"
      />

      <section className={`active-strip${active ? ' on' : ''}`} aria-label="Active routine">
        <span className="as-icon" aria-hidden>
          <Icon name={active ? 'check' : 'calendar'} size={18} />
        </span>
        <div className="grow">
          <strong>{active ? 'Active routine' : 'Not active'}</strong>
          {!active && <div className="muted small">Plan at least one day to make it active.</div>}
        </div>
        {active && <span className="tag as-pill">Active</span>}
      </section>

      <section className={`card form-stack menu-host${manageOpen ? ' open' : ''}`}>
        <div className="field">
          <div className="field-head">
            <label htmlFor="routine-name">Routine name</label>
            <div className="menu-wrap" ref={menuRef}>
              <button
                className="btn icon-only ghost sm"
                aria-label="Manage routine"
                aria-haspopup="menu"
                aria-expanded={manageOpen}
                onClick={() => setManageOpen(!manageOpen)}
              >
                <Icon name="dots" size={20} stroke={3} />
              </button>
              {manageOpen && (
                <div className="menu" role="menu" aria-label="Manage routine">
                  <button role="menuitem" className="row-item row-btn" onClick={() => { setManageOpen(false); duplicate() }}>
                    <span className="rb-icon" aria-hidden>
                      <Icon name="copy" size={18} />
                    </span>
                    <div className="grow">
                      <div className="title">Duplicate routine</div>
                      <div className="sub">Make a copy to edit separately</div>
                    </div>
                  </button>
                  {PRESETS[r.id] && (
                    <button role="menuitem" className="row-item row-btn" onClick={() => { setManageOpen(false); if (confirm(`Reset "${PRESETS[r.id]().name}" to its default exercises?`)) resetPreset(r.id) }}>
                      <span className="rb-icon" aria-hidden>
                        <Icon name="reset" size={18} />
                      </span>
                      <div className="grow">
                        <div className="title">Reset to default</div>
                        <div className="sub">Restore the built-in exercises</div>
                      </div>
                    </button>
                  )}
                  <button role="menuitem" className="row-item row-btn danger" disabled={onlyOne} onClick={() => { setManageOpen(false); del() }}>
                    <span className="rb-icon" aria-hidden>
                      <Icon name="trash" size={18} />
                    </span>
                    <div className="grow">
                      <div className="title">Delete routine</div>
                      <div className="sub">{onlyOne ? 'You need at least one routine' : 'Workout history is kept'}</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
          <input id="routine-name" value={r.name} onChange={(e) => updateRoutine(r.id, (rt) => ({ ...rt, name: e.target.value }))} />
        </div>
        <div className="field">
          <span>Planned days</span>
          <DayPicker value={r.days ?? []} onChange={(days) => updateRoutine(r.id, (rt) => ({ ...rt, days }))} />
          {r.days?.length ? <small className="muted small">{formatDays(r.days)}</small> : null}
        </div>
      </section>

      <div>
        <div className="section-head">
          <span className="label">Exercises</span>
          <span className="muted small">Tap to edit</span>
        </div>
        {r.exercises.length === 0 && <div className="group empty">No exercises yet.</div>}
        {r.exercises.map((ex, i) => (
          <ExerciseEditor
            key={ex.id}
            ex={ex}
            index={i}
            count={r.exercises.length}
            open={openId === ex.id}
            onToggle={() => setOpenId(openId === ex.id ? null : ex.id)}
            units={data.settings.units}
            defaultRest={data.settings.defaultRest}
            onChange={(p) => setEx(ex.id, p)}
            onMove={(d) => updateRoutine(r.id, (rt) => ({ ...rt, exercises: move(rt.exercises, i, d) }))}
            onDelete={() => confirm(`Delete "${ex.name}"?`) && updateRoutine(r.id, (rt) => ({ ...rt, exercises: rt.exercises.filter((e) => e.id !== ex.id) }))}
          />
        ))}
        <button className="btn dashed block" style={{ marginTop: 10 }} onClick={addEx}>
          <Icon name="plus" size={18} /> Add exercise
        </button>
      </div>

    </div>
  )
}

interface EdProps {
  ex: Exercise
  index: number
  count: number
  open: boolean
  onToggle: () => void
  units: 'kg' | 'lb'
  defaultRest: number
  onChange: (p: Partial<Exercise>) => void
  onMove: (d: number) => void
  onDelete: () => void
}

function ExerciseEditor({ ex, index, count, open, onToggle, units, defaultRest, onChange, onMove, onDelete }: EdProps) {
  return (
    <div className={`ex-card${open ? ' open' : ''}`}>
      <div className="ex-card-head">
        <button className="open-btn" onClick={onToggle} aria-expanded={open}>
          <span className="idx">{String(index + 1).padStart(2, '0')}</span>
          <span style={{ minWidth: 0 }}>
            <span className="name">{ex.name}</span>
            <span className="meta">
              {ex.sets} × {ex.type === 'timed' ? `${ex.duration}s` : `${ex.repMin}-${ex.repMax}`}
              {ex.weight > 0 ? ` @ ${toDisp(ex.weight, units)}${units}` : ''}
            </span>
          </span>
        </button>
        <button className="btn" aria-label={`Move ${ex.name} up`} disabled={index === 0} onClick={() => onMove(-1)}>
          <Icon name="up" size={18} />
        </button>
        <button className="btn" aria-label={`Move ${ex.name} down`} disabled={index === count - 1} onClick={() => onMove(1)}>
          <Icon name="down" size={18} />
        </button>
      </div>
      {open && (
        <div className="ex-form form-stack">
          <label className="field">
            <span>Name</span>
            <input value={ex.name} onChange={(e) => onChange({ name: e.target.value })} />
          </label>
          <GuideEditor ex={ex} onChange={onChange} />
          <div className="seg" role="radiogroup" aria-label="Type">
            {(['reps', 'timed'] as const).map((t) => (
              <button key={t} role="radio" aria-checked={ex.type === t} className={ex.type === t ? 'on' : ''} onClick={() => onChange({ type: t })}>
                {t === 'reps' ? 'Reps' : 'Timed'}
              </button>
            ))}
          </div>
          <div className="grid2">
            <label className="field">
              <span>Sets</span>
              <NumInput value={ex.sets} min={1} max={20} onChange={(v) => onChange({ sets: v ?? 1 })} ariaLabel="Sets" />
            </label>
            {ex.type === 'timed' ? (
              <label className="field">
                <span>Duration (s)</span>
                <NumInput value={ex.duration} min={1} max={3600} onChange={(v) => onChange({ duration: v ?? 1 })} ariaLabel="Duration seconds" />
              </label>
            ) : (
              <>
                <label className="field">
                  <span>Min reps</span>
                  <NumInput value={ex.repMin} min={0} max={500} onChange={(v) => onChange({ repMin: v ?? 0, repMax: Math.max(ex.repMax, v ?? 0) })} ariaLabel="Min reps" />
                </label>
                <label className="field">
                  <span>Max reps</span>
                  <NumInput value={ex.repMax} min={1} max={500} onChange={(v) => onChange({ repMax: v ?? 1, repMin: Math.min(ex.repMin, v ?? 1) })} ariaLabel="Max reps" />
                </label>
              </>
            )}
            <label className="field">
              <span>Weight ({units})</span>
              <NumInput value={toDisp(ex.weight, units)} decimal onChange={(v) => onChange({ weight: fromDisp(v ?? 0, units) })} ariaLabel="Weight" />
            </label>
            <label className="field">
              <span>Rest (s)</span>
              <NumInput value={ex.rest} allowEmpty placeholder={`${defaultRest} default`} max={900} onChange={(v) => onChange({ rest: v })} ariaLabel="Rest seconds" />
            </label>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea rows={2} value={ex.notes} placeholder="Form cues, tempo…" onChange={(e) => onChange({ notes: e.target.value })} />
          </label>
          <button className="text-btn danger" onClick={onDelete}>
            <Icon name="trash" size={16} /> Delete exercise
          </button>
        </div>
      )}
    </div>
  )
}


const STORAGE_BUDGET = 4_500_000

function GuideEditor({ ex, onChange }: { ex: Exercise; onChange: (p: Partial<Exercise>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const anim = animFor(ex)
  const detected = detectAnim(ex.name)
  const autoLabel = `Auto (${detected ? ANIMS[detected].label : 'generic'})`

  const onFile = async (f: File) => {
    setErr('')
    setBusy(true)
    try {
      const url = await compressImage(f)
      const used = localStorage.getItem('wt.data.v1')?.length ?? 0
      if (used + url.length > STORAGE_BUDGET) throw new Error('Storage is full. Remove some photos first.')
      onChange({ photo: url })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="guide-editor">
      <div className="guide-preview">
        {ex.photo ? (
          <img src={ex.photo} alt={`${ex.name} photo`} />
        ) : anim ? (
          <ExerciseFigure anim={anim} dumbbells={ex.weight > 0} title={`${ex.name} preview`} />
        ) : (
          <span className="muted small">No guide</span>
        )}
      </div>
      <div className="guide-controls">
        <label className="field">
          <span>Form guide</span>
          <select aria-label="Illustration" value={ex.illustration ?? ''} onChange={(e) => onChange({ illustration: e.target.value || undefined })}>
            <option value="">{autoLabel}</option>
            {ANIM_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
            <option value="none">None</option>
          </select>
        </label>
        <div className="btn-row wrap">
          <button className="btn soft sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> {ex.photo ? 'Replace photo' : 'Add photo'}
          </button>
          {ex.photo && (
            <button className="btn sm danger" onClick={() => onChange({ photo: undefined })}>
              Remove
            </button>
          )}
        </div>
        {err && <p className="small" style={{ color: 'var(--danger)', margin: 0 }} role="alert">{err}</p>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        aria-label="Exercise photo"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
