import { useEffect, useRef, useState, type ReactNode } from 'react'
import { requestPersist } from '../backup'
import { FormGuide, GuideThumb } from '../components/FormGuide'
import { Icon } from '../components/Icon'
import { Stepper } from '../components/NumInput'
import { useCountdown, useTick, useWakeLock } from '../hooks'
import { buildSteps, buildWorkout, logKey, restFor, suggestions } from '../logic'
import { useStore } from '../store'
import type { Exercise, Routine, Session, SetLog, Settings, Step, Stretch, Workout } from '../types'
import { alertUser, fmtDuration, fmtTime, fmtW, fromDisp, scheduleCountdown, toDisp, unlockAudio, vibrateCue } from '../util'

interface Nav {
  onBack: () => void
  onSkip: () => void
  backDisabled: boolean
}

export function WorkoutScreen({ onExit }: { onExit: () => void }) {
  const { data, update, updateRoutine, session, setSession } = useStore()
  const [finished, setFinished] = useState<Workout | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const routine = session ? data.routines.find((r) => r.id === session.routineId) : undefined
  const s = data.settings
  useWakeLock(!!session)
  useTick(!!session, 1000)

  if (finished) {
    const r = data.routines.find((x) => x.id === finished.routineId)
    return (
      <Summary
        w={finished}
        routine={r}
        settings={s}
        onApply={(exId, fn) => r && updateRoutine(r.id, (rt) => ({ ...rt, exercises: rt.exercises.map((e) => (e.id === exId ? fn(e) : e)) }))}
        onDone={() => {
          setFinished(null)
          onExit()
        }}
      />
    )
  }

  const bail = (msg: string) => (
    <div className="screen center-screen">
      <p className="muted">{msg}</p>
      <button className="btn primary" onClick={() => { setSession(null); onExit() }}>
        Back to Today
      </button>
    </div>
  )
  if (!session || !routine) return bail('No workout in progress.')
  const steps = buildSteps(routine, s)
  if (steps.length === 0) return bail('This routine has no exercises. Add some in Routines.')

  const idx = Math.min(Math.max(0, session.idx), steps.length - 1)
  const step = steps[idx]

  const finish = (sess: Session) => {
    const w = buildWorkout(routine, sess, Date.now(), data.history)
    setSession(null)
    if (w.exercises.length === 0) return onExit()
    update((d) => ({ ...d, history: [...d.history, w] }))
    void requestPersist() // browsers grant persistence more readily to engaged sites
    alertUser(s, true)
    setFinished(w)
  }

  const goTo = (i: number, sess: Session = session, rest: number | null = null) => {
    if (i >= steps.length) return finish(sess)
    const manual = s.restMode === 'manual'
    setSession({ ...sess, idx: Math.max(0, i), rest: rest && rest > 0 ? { endAt: manual ? 0 : Date.now() + rest * 1000, total: rest * 1000, pending: manual } : null })
  }

  const restAfter = (i: number): number | null => {
    const cur = steps[i]
    const nxt = steps[i + 1]
    if (cur.kind !== 'set' || !nxt || nxt.kind !== 'set') return null
    return restFor(routine.exercises[cur.exIdx], s)
  }

  const logSet = (log: SetLog) => {
    if (step.kind !== 'set') return
    const ex = routine.exercises[step.exIdx]
    const sess = { ...session, logs: { ...session.logs, [logKey(ex.id, step.setIdx)]: log } }
    goTo(idx + 1, sess, restAfter(idx))
  }

  const exStart = (exIdx: number) => steps.findIndex((st) => st.kind === 'set' && st.exIdx === exIdx)
  const curEx = step.kind === 'set' ? step.exIdx : -1
  const loggedCount = Object.keys(session.logs).length
  const nav: Nav = { onBack: () => goTo(idx - 1), onSkip: () => goTo(idx + 1), backDisabled: idx === 0 }
  const doneOf = (ex: Exercise) => Array.from({ length: ex.sets }, (_, k) => session.logs[logKey(ex.id, k)]).filter(Boolean).length

  return (
    <div className="screen workout">
      <header className="wo-head">
        <button className="text-btn" onClick={onExit} aria-label="Back to menu">
          <Icon name="chevL" size={18} /> Menu
        </button>
        <div className="wo-title">
          <strong>{routine.name}</strong>
          <span className="mono">{fmtTime((Date.now() - session.start) / 1000)}</span>
        </div>
        <button className="text-btn danger end" onClick={() => setConfirmEnd(true)}>
          End
        </button>
      </header>

      <div className="segbar" role="progressbar" aria-valuenow={idx} aria-valuemin={0} aria-valuemax={steps.length} aria-label="Workout progress">
        {routine.exercises.map((ex, i) => (
          <span key={ex.id} className={i === curEx ? 'cur' : ''}>
            <i style={{ width: `${(doneOf(ex) / Math.max(1, ex.sets)) * 100}%` }} />
          </span>
        ))}
      </div>
      <div className="wo-step mono">
        <span>
          Step {idx + 1}/{steps.length}
        </span>
        <span>{Math.round((idx / steps.length) * 100)}%</span>
      </div>

      {session.rest ? (
        <RestView
          rest={session.rest}
          next={step}
          routine={routine}
          settings={s}
          nav={nav}
          onAdjust={(ms) => {
            const r = session.rest
            if (!r) return
            const total = Math.max(5000, r.total + ms)
            setSession({ ...session, rest: { ...r, total, endAt: r.pending ? 0 : r.endAt + (total - r.total) } })
          }}
          onStart={() => {
            const r = session.rest
            if (!r) return
            unlockAudio()
            setSession({ ...session, rest: { total: r.total, endAt: Date.now() + r.total, pending: false } })
          }}
          onDone={() => setSession((cur) => (cur ? { ...cur, rest: null } : cur))}
        />
      ) : step.kind === 'set' ? (
        <SetView
          key={`${routine.exercises[step.exIdx].id}:${step.setIdx}`}
          ex={routine.exercises[step.exIdx]}
          exIdx={step.exIdx}
          exCount={routine.exercises.length}
          setIdx={step.setIdx}
          session={session}
          settings={s}
          nav={nav}
          onLog={logSet}
        />
      ) : (
        <StretchView key={`${step.kind}:${step.stretch.id}`} stretch={step.stretch} kind={step.kind} settings={s} nav={nav} onNext={() => goTo(idx + 1)} />
      )}

      {curEx >= 0 && !session.rest && (
        <div className="jump">
          <button className="text-btn" disabled={curEx === 0} onClick={() => goTo(exStart(curEx - 1))}>
            <Icon name="chevL" size={16} /> Prev exercise
          </button>
          <button
            className="text-btn"
            onClick={() => {
              const after = steps.findIndex((st, i) => i > idx && (st.kind !== 'set' || st.exIdx !== curEx))
              goTo(after === -1 ? steps.length : after)
            }}
          >
            Next exercise <Icon name="chevR" size={16} />
          </button>
        </div>
      )}

      <details className="up-next">
        <summary>
          <span className="label">All exercises</span>
          <Icon name="chevR" size={16} />
        </summary>
        <ol className="wo-list">
          {routine.exercises.map((ex, i) => (
            <li key={ex.id} className={i === curEx ? 'cur' : ''}>
              <button onClick={() => goTo(exStart(i))}>{ex.name}</button>
              <span className="dots" aria-label={`${doneOf(ex)} of ${ex.sets} sets done`}>
                {Array.from({ length: ex.sets }, (_, k) => (
                  <i key={k} className={session.logs[logKey(ex.id, k)] ? 'on' : ''} />
                ))}
              </span>
            </li>
          ))}
        </ol>
      </details>

      {confirmEnd && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="end-title" onClick={(e) => e.target === e.currentTarget && setConfirmEnd(false)}>
          <div className="sheet">
            <h3 id="end-title">End workout?</h3>
            <p className="muted">
              {loggedCount} set{loggedCount === 1 ? '' : 's'} logged so far.
            </p>
            <button className="btn primary lg block" disabled={loggedCount === 0} onClick={() => { setConfirmEnd(false); finish(session) }}>
              Save & finish
            </button>
            <button className="btn danger lg block" onClick={() => { setConfirmEnd(false); setSession(null); onExit() }}>
              Discard workout
            </button>
            <button className="btn ghost lg block" onClick={() => setConfirmEnd(false)}>
              Keep going
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Ref that always holds the latest value (stable identity for effects/timers). */
function useLatest<T>(v: T) {
  const r = useRef(v)
  r.current = v
  return r
}

function Dock({ nav, children }: { nav: Nav; children: ReactNode }) {
  return (
    <div className="dock">
      <div className="dock-inner">
        <button className="btn side" aria-label="Previous step" disabled={nav.backDisabled} onClick={nav.onBack}>
          <Icon name="chevL" />
        </button>
        {children}
        <button className="btn side" aria-label="Skip step" onClick={nav.onSkip}>
          <Icon name="skip" size={20} />
        </button>
      </div>
    </div>
  )
}

export function targetText(ex: Exercise, s: Settings): string {
  if (ex.type === 'timed') return `${ex.duration} s`
  const reps = ex.repMin === ex.repMax || !ex.repMin ? `${ex.repMax}` : `${ex.repMin}-${ex.repMax}`
  return `${reps} reps${ex.weight > 0 ? ` @ ${fmtW(ex.weight, s.units)}` : ''}`
}

function RestView({ rest, next, routine, settings, nav, onAdjust, onStart, onDone }: { rest: NonNullable<Session['rest']>; next: Step; routine: Routine; settings: Settings; nav: Nav; onAdjust: (ms: number) => void; onStart: () => void; onDone: () => void }) {
  const pending = !!rest.pending
  const [ending, setEnding] = useState(false)
  useTick(!pending && !ending, 200)
  const remaining = pending ? rest.total : Math.max(0, rest.endAt - Date.now())

  // sounds are scheduled ahead on the audio clock so they fire on time in the background
  useEffect(() => {
    if (pending) return
    return scheduleCountdown(settings, rest.endAt, 'end')
  }, [pending, rest.endAt, settings])

  useEffect(() => {
    if (!pending && remaining <= 0 && !ending) {
      setEnding(true)
      vibrateCue(settings, 'end')
    }
  })
  const doneRef = useLatest(onDone)
  useEffect(() => {
    if (!ending) return
    const t = setTimeout(() => doneRef.current(), 1600)
    return () => clearTimeout(t)
  }, [ending, doneRef])

  const nextEx = next.kind === 'set' ? routine.exercises[next.exIdx] : null
  const nextName = nextEx ? nextEx.name : next.kind !== 'set' ? next.stretch.name : ''
  return (
    <section className="wo-main">
      <div className="eyebrow live">{pending ? 'Set done' : 'Break'}</div>
      <Ring pct={rest.total > 0 ? remaining / rest.total : 0} label={fmtTime(remaining / 1000)} caption={pending ? 'Break ready' : 'Recover'} urgent={!pending && remaining <= 3000} />
      {ending && <TimeUp title="Break over" sub={nextName ? `Next: ${nextName}` : undefined} onClose={onDone} />}
      <div className="ring-sub">
        {pending && (
          <button className="btn soft" aria-label="Shorten break by 15 seconds" onClick={() => onAdjust(-15000)}>
            −15s
          </button>
        )}
        <button className="btn soft" aria-label="Add 15 seconds" onClick={() => onAdjust(15000)}>
          +15s
        </button>
        {pending && (
          <button className="btn soft" onClick={onDone}>
            Skip break
          </button>
        )}
      </div>
      <div className="next-card">
        {nextEx && settings.showGuides ? <GuideThumb ex={nextEx} animate /> : <Icon name="chevR" size={18} />}
        <div className="grow">
          <span className="label">Up next</span>
          <strong>{nextName}</strong>
          {nextEx && next.kind === 'set' && (
            <span className="small muted tnum-soft">
              Set {next.setIdx + 1} of {nextEx.sets} · {targetText(nextEx, settings)}
            </span>
          )}
        </div>
      </div>
      <Dock nav={nav}>
        {pending ? (
          <button className="btn signal xl main" onClick={onStart}>
            <Icon name="clock" size={20} /> Start break
          </button>
        ) : (
          <button className="btn primary xl main" onClick={onDone}>
            Skip rest
          </button>
        )}
      </Dock>
    </section>
  )
}

function SetView({ ex, exIdx, exCount, setIdx, session, settings, nav, onLog }: { ex: Exercise; exIdx: number; exCount: number; setIdx: number; session: Session; settings: Settings; nav: Nav; onLog: (l: SetLog) => void }) {
  const existing = session.logs[logKey(ex.id, setIdx)]
  const prev = session.logs[logKey(ex.id, setIdx - 1)]
  const [reps, setReps] = useState(existing?.reps ?? prev?.reps ?? ex.repMax)
  const [weight, setWeight] = useState(existing?.weight ?? prev?.weight ?? ex.weight)
  const u = settings.units

  return (
    <section className="wo-main">
      <div className="eyebrow">
        Exercise {exIdx + 1}/{exCount} · Set {setIdx + 1} of {ex.sets}
      </div>
      <h2 className="ex-name">{ex.name}</h2>
      <div className="target">
        <Icon name="layers" size={16} /> Target <span className="tnum">{targetText(ex, settings)}</span>
      </div>
      {ex.notes && <p className="notes">{ex.notes}</p>}
      {settings.showGuides && <FormGuide key={ex.id} ex={ex} compact={ex.type === 'timed'} />}
      {ex.type === 'timed' ? (
        <TimedView ex={ex} settings={settings} nav={nav} onComplete={(sec) => onLog({ reps: 0, weight, duration: sec })} />
      ) : (
        <>
          <div className="steppers">
            <Stepper label="Reps" value={reps} onChange={setReps} />
            <Stepper label="Weight" unit={u} decimal step={u === 'kg' ? 0.5 : 1} value={toDisp(weight, u)} onChange={(v) => setWeight(fromDisp(v, u))} />
          </div>
          <Dock nav={nav}>
            <button className="btn primary xl main" onClick={() => { unlockAudio(); onLog({ reps, weight, duration: 0 }) }}>
              <Icon name="check" size={22} stroke={2.6} /> Done
            </button>
          </Dock>
        </>
      )}
    </section>
  )
}

type TPhase = 'idle' | 'ready' | 'run' | 'done'

function TimedView({ ex, settings, nav, onComplete }: { ex: Exercise; settings: Settings; nav: Nav; onComplete: (sec: number) => void }) {
  const total = ex.duration * 1000
  const [phase, setPhase] = useState<TPhase>('idle')
  const [flash, setFlash] = useState(false)
  const cd = useCountdown(total, () => {
    if (phase === 'ready') {
      vibrateCue(settings, 'go')
      setPhase('run')
      cd.start(total)
    } else if (phase === 'run') {
      setPhase('done')
      vibrateCue(settings, 'end')
      setFlash(true)
    }
  })
  useEffect(() => {
    if (cd.endAt == null || (phase !== 'ready' && phase !== 'run')) return
    return scheduleCountdown(settings, cd.endAt, phase === 'ready' ? 'go' : 'end')
  }, [cd.endAt, phase, settings])
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(false), 1600)
    return () => clearTimeout(t)
  }, [flash])
  const label = phase === 'ready' ? `${Math.ceil(cd.remaining / 1000)}` : fmtTime(cd.remaining / 1000)
  const pct = phase === 'ready' ? cd.remaining / (settings.getReady * 1000) : cd.remaining / total
  const held = Math.round(phase === 'done' ? ex.duration : phase === 'run' ? (total - cd.remaining) / 1000 : 0)
  const status = phase === 'ready' ? 'Get ready…' : phase === 'run' ? (cd.running ? 'Hold!' : 'Paused') : phase === 'done' ? 'Time!' : 'Tap start'

  const begin = () => {
    unlockAudio()
    if (settings.getReady > 0) {
      setPhase('ready')
      cd.start(settings.getReady * 1000)
    } else {
      setPhase('run')
      cd.start(total)
    }
  }

  let primary: ReactNode
  if (phase === 'idle')
    primary = (
      <button className="btn primary xl main" onClick={begin}>
        <Icon name="play" size={20} /> Start
      </button>
    )
  else if (phase === 'done')
    primary = (
      <button className="btn signal xl main" onClick={() => onComplete(held)}>
        <Icon name="check" size={22} stroke={2.6} /> Done
      </button>
    )
  else if (cd.running)
    primary = (
      <button className="btn soft xl main" onClick={cd.pause}>
        <Icon name="pause" size={20} /> Pause
      </button>
    )
  else
    primary = (
      <button className="btn primary xl main" onClick={cd.resume}>
        <Icon name="play" size={20} /> Resume
      </button>
    )

  return (
    <>
      <Ring pct={pct} label={label} caption={status} accent={phase === 'ready' ? 'warn' : undefined} urgent={phase === 'run' && cd.running && cd.remaining <= 3000} done={phase === 'done'} />
      {flash && <TimeUp title="Time!" sub={`${ex.name} complete`} onClose={() => setFlash(false)} />}
      <div className="ring-sub">
        {phase !== 'idle' && (
          <button className="btn soft sm" onClick={() => { setPhase('idle'); cd.reset(total) }}>
            <Icon name="reset" size={16} /> Reset
          </button>
        )}
        {phase === 'run' && held > 0 && (
          <button className="btn soft sm" onClick={() => onComplete(held)}>
            Log {held}s
          </button>
        )}
      </div>
      <Dock nav={nav}>{primary}</Dock>
    </>
  )
}

function StretchView({ stretch, kind, settings, nav, onNext }: { stretch: Stretch; kind: 'warm' | 'cool'; settings: Settings; nav: Nav; onNext: () => void }) {
  const total = stretch.duration * 1000
  const [ending, setEnding] = useState(false)
  const cd = useCountdown(total, () => {
    vibrateCue(settings, 'end')
    setEnding(true)
  })
  useEffect(() => {
    if (cd.endAt == null) return
    return scheduleCountdown(settings, cd.endAt, 'end')
  }, [cd.endAt, settings])
  const nextRef = useLatest(onNext)
  useEffect(() => {
    if (!ending) return
    const t = setTimeout(() => nextRef.current(), 1600)
    return () => clearTimeout(t)
  }, [ending, nextRef])
  const fresh = cd.remaining === total
  return (
    <section className="wo-main">
      <div className="eyebrow">{kind === 'warm' ? 'Warm-up' : 'Cool-down'}</div>
      <h2 className="ex-name">{stretch.name}</h2>
      <Ring pct={cd.remaining / total} label={fmtTime(cd.remaining / 1000)} caption={cd.running ? 'Stretch' : fresh ? `${stretch.duration}s` : 'Paused'} urgent={cd.running && cd.remaining <= 3000} />
      {ending && <TimeUp title="Nice stretch" sub={stretch.name} onClose={onNext} />}
      <div className="ring-sub">
        {cd.running ? (
          <button className="btn soft" onClick={cd.pause}>
            <Icon name="pause" size={16} /> Pause
          </button>
        ) : (
          <button className="btn soft" onClick={() => { unlockAudio(); if (fresh) cd.start(total); else cd.resume() }}>
            <Icon name="play" size={16} /> {fresh ? 'Start' : 'Resume'}
          </button>
        )}
        {!fresh && (
          <button className="btn soft" onClick={() => cd.reset(total)}>
            <Icon name="reset" size={16} /> Reset
          </button>
        )}
      </div>
      <Dock nav={nav}>
        <button className="btn primary xl main" onClick={onNext}>
          Next
        </button>
      </Dock>
    </section>
  )
}

function Ring({ pct, label, caption, accent, urgent, done }: { pct: number; label: string; caption?: string; accent?: 'warn'; urgent?: boolean; done?: boolean }) {
  const R = 92
  const C = 2 * Math.PI * R
  const p = Math.min(1, Math.max(0, pct))
  return (
    <div className={`ring ${accent ?? ''}${urgent ? ' urgent' : ''}${done ? ' done' : ''}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={R} className="ring-bg" />
        <circle cx="100" cy="100" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 100 100)" />
      </svg>
      <div className="ring-label" aria-live="polite">
        <span className="mono" key={urgent ? label : 'steady'}>
          {label}
        </span>
        {caption && <small className={accent === 'warn' ? 'eyebrow warn' : ''}>{caption}</small>}
      </div>
    </div>
  )
}

/** Full-screen "time's up" burst. Tap anywhere to continue. */
function TimeUp({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="timeup" role="alert" onClick={onClose}>
      <div className="timeup-burst" aria-hidden="true">
        <i />
        <i />
        <i />
        <div className="timeup-core">
          <Icon name="check" size={64} stroke={2.8} />
        </div>
      </div>
      <h2 className="timeup-title">{title}</h2>
      {sub && <p className="timeup-sub">{sub}</p>}
      <span className="timeup-hint">Tap to continue</span>
    </div>
  )
}

function Summary({ w, routine, settings, onApply, onDone }: { w: Workout; routine?: Routine; settings: Settings; onApply: (exId: string, fn: (e: Exercise) => Exercise) => void; onDone: () => void }) {
  const sets = w.exercises.reduce((a, e) => a + e.sets.length, 0)
  const planned = w.exercises.reduce((a, e) => a + e.targetSets, 0)
  const sugg = routine ? suggestions(routine, w, settings.units) : []
  return (
    <div className="screen summary">
      <div className="summary-hero">
        <div className="badge">
          <Icon name="check" size={30} stroke={2.8} />
        </div>
        <span className="label">{w.routineName}</span>
        <h1 className="display">Workout complete</h1>
      </div>
      <div className="big-stats">
        <div className="big-stat">
          <span className="v">{fmtDuration(w.end - w.start)}</span>
          <span className="label">Time</span>
        </div>
        <div className="big-stat">
          <span className="v">
            {sets}
            {planned > sets && <span className="muted">/{planned}</span>}
          </span>
          <span className="label">Sets</span>
        </div>
        <div className="big-stat">
          <span className="v">{w.prs.length}</span>
          <span className="label">New PRs</span>
        </div>
      </div>
      {w.prs.length > 0 && (
        <section className="card">
          <h3 className="card-title">Personal records</h3>
          <ul className="pr-list">
            {w.prs.map((n) => (
              <li key={n}>
                <Icon name="trophy" size={18} /> {n}
              </li>
            ))}
          </ul>
        </section>
      )}
      {sugg.length > 0 && (
        <section className="card">
          <h3 className="card-title">
            <Icon name="trend" size={18} /> Ready to progress
          </h3>
          {sugg.map((sg) => (
            <div key={sg.exerciseId} className="sugg">
              <div>
                <strong>{sg.name}</strong>
                <div className="muted">{sg.text}</div>
              </div>
              <button className="btn primary sm" onClick={() => onApply(sg.exerciseId, sg.apply)}>
                Apply
              </button>
            </div>
          ))}
        </section>
      )}
      <section className="card">
        <h3 className="card-title">Logged sets</h3>
        {w.exercises.map((e) => (
          <div key={e.exerciseId} className="sum-row">
            <span>{e.name}</span>
            <span className="mono">{e.sets.map((x) => (e.type === 'timed' ? `${x.duration}s` : `${x.reps}${x.weight ? `×${toDisp(x.weight, settings.units)}` : ''}`)).join(' · ')}</span>
          </div>
        ))}
      </section>
      <button className="btn primary xl block" style={{ marginTop: 18 }} onClick={onDone}>
        Done
      </button>
    </div>
  )
}
