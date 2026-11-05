import { useEffect, useRef, useState } from 'react'
import { ExerciseFigure } from '../components/ExerciseFigure'
import { Icon } from '../components/Icon'
import { NumInput } from '../components/NumInput'
import { RoutineCard } from '../components/RoutineCard'
import { estimateMin } from '../logic'
import { PRESETS } from '../seed'
import { useStore } from '../store'
import type { Exercise, Routine, Stretch } from '../types'
import { ANIM_OPTIONS, animFor, detectAnim, ANIMS } from '../figures/anims'
import { compressImage, fromDisp, toDisp, uid } from '../util'

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const out = [...arr]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

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
    const nr: Routine = { id: uid(), name: 'New routine', exercises: [ex], warmup: [], cooldown: [] }
    update((d) => ({ ...d, routines: [...d.routines, nr] }))
    setFreshExercise(ex.id)
    setOpenRoutine(nr.id)
  }
  const sorted = [...data.routines].sort((a, b) => Number(b.id === data.activeRoutineId) - Number(a.id === data.activeRoutineId))

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <span className="label">
            {data.routines.length} routine{data.routines.length === 1 ? '' : 's'}
          </span>
          <h1 className="display">Routines</h1>
        </div>
        <button className="btn primary icon-only" aria-label="New routine" onClick={addRoutine}>
          <Icon name="plus" size={20} stroke={2.2} />
        </button>
      </header>

      <div className="routine-list">
        {sorted.map((r) => (
          <RoutineCard key={r.id} r={r} active={r.id === data.activeRoutineId} settings={data.settings} history={data.history} onClick={() => setOpenRoutine(r.id)} />
        ))}
      </div>

      <button className="btn dashed block" onClick={addRoutine}>
        <Icon name="plus" size={18} /> New routine
      </button>

      {Object.keys(PRESETS).some((id) => !data.routines.some((x) => x.id === id)) && (
        <button className="text-btn" style={{ marginTop: 8 }} onClick={restorePresets}>
          <Icon name="reset" size={16} /> Restore built-in routines
        </button>
      )}
    </div>
  )
}

function RoutineDetail({ r, initialOpen, onBack, onOpen }: { r: Routine; initialOpen: string | null; onBack: () => void; onOpen: (id: string, exId?: string) => void }) {
  const { data, update, updateRoutine, resetPreset } = useStore()
  const [openId, setOpenId] = useState<string | null>(initialOpen)
  const isActive = r.id === data.activeRoutineId
  const sets = r.exercises.reduce((a, e) => a + e.sets, 0)

  const duplicate = () => {
    const nr: Routine = { ...structuredClone(r), id: uid(), name: `${r.name} (copy)` }
    nr.exercises = nr.exercises.map((e) => ({ ...e, id: uid() }))
    update((d) => ({ ...d, routines: [...d.routines, nr] }))
    onOpen(nr.id)
  }
  const del = () => {
    if (data.routines.length <= 1) return alert('You need at least one routine.')
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
      <button className="text-btn back-link" onClick={onBack}>
        <Icon name="chevL" size={18} /> All routines
      </button>
      <header className="topbar">
        <div style={{ minWidth: 0 }}>
          <span className="label">
            {r.exercises.length} exercise{r.exercises.length === 1 ? '' : 's'} · {sets} set{sets === 1 ? '' : 's'} · ~{estimateMin(r, data.settings)} min
          </span>
          <h1 className="display detail-title">{r.name || 'Untitled'}</h1>
        </div>
      </header>

      <section className="card form-stack">
        <label className="field">
          <span>Routine name</span>
          <input value={r.name} onChange={(e) => updateRoutine(r.id, (rt) => ({ ...rt, name: e.target.value }))} />
        </label>
        <div className="btn-row wrap">
          {isActive ? (
            <span className="tag" style={{ margin: 0, alignSelf: 'center' }}>
              Active routine
            </span>
          ) : (
            <button className="btn primary sm" onClick={() => update((d) => ({ ...d, activeRoutineId: r.id }))}>
              Make active
            </button>
          )}
          <button className="btn sm" onClick={duplicate}>
            <Icon name="copy" size={16} /> Duplicate
          </button>
          <button className="btn danger sm" onClick={del}>
            <Icon name="trash" size={16} /> Delete
          </button>
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

      <StretchEditor title="Warm-up" items={r.warmup} onChange={(warmup) => updateRoutine(r.id, (rt) => ({ ...rt, warmup }))} />
      <StretchEditor title="Cool-down" items={r.cooldown} onChange={(cooldown) => updateRoutine(r.id, (rt) => ({ ...rt, cooldown }))} />
      <p className="muted small" style={{ margin: '8px 2px' }}>
        Turn warm-up and cool-down on in Settings.
      </p>

      {PRESETS[r.id] && (
        <div className="danger-zone">
          <button className="btn danger block" onClick={() => confirm(`Reset "${PRESETS[r.id]().name}" to its default exercises?`) && resetPreset(r.id)}>
            <Icon name="reset" size={18} /> Reset to default
          </button>
        </div>
      )}
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

function StretchEditor({ title, items, onChange }: { title: string; items: Stretch[]; onChange: (s: Stretch[]) => void }) {
  return (
    <div>
      <div className="section-head">
        <span className="label">{title}</span>
        <span className="muted small mono">{items.reduce((a, x) => a + x.duration, 0)}s</span>
      </div>
      <div className="card" style={{ paddingTop: 6, paddingBottom: 12 }}>
        {items.length === 0 && <p className="muted small">No stretches yet.</p>}
        {items.map((st, i) => (
          <div key={st.id} className="stretch-row">
            <input className="input" aria-label={`${title} name`} value={st.name} onChange={(e) => onChange(items.map((x) => (x.id === st.id ? { ...x, name: e.target.value } : x)))} />
            <NumInput className="input num" value={st.duration} min={1} max={600} ariaLabel={`${st.name} seconds`} onChange={(v) => onChange(items.map((x) => (x.id === st.id ? { ...x, duration: v ?? 1 } : x)))} />
            <button className="btn" aria-label={`Move ${st.name} up`} disabled={i === 0} onClick={() => onChange(move(items, i, -1))}>
              <Icon name="up" size={16} />
            </button>
            <button className="btn" aria-label={`Remove ${st.name}`} onClick={() => onChange(items.filter((x) => x.id !== st.id))}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
        <button className="btn soft sm" style={{ marginTop: 12 }} onClick={() => onChange([...items, { id: uid(), name: 'Stretch', duration: 30 }])}>
          <Icon name="plus" size={16} /> Add stretch
        </button>
      </div>
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
