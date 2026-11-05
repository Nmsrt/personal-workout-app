import { useState } from 'react'
import { backupDue, exportBackup, snoozeUntil } from '../backup'
import { Icon } from '../components/Icon'
import { RoutineCard } from '../components/RoutineCard'
import { GuideThumb } from '../components/FormGuide'
import { estimateMin, suggestions, weekStart, weekStreak, workoutsThisWeek } from '../logic'
import { activeRoutine, useStore } from '../store'
import { dayKey, unlockAudio } from '../util'
import { targetText } from './WorkoutScreen'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function ThemeToggle() {
  const { data, update } = useStore()
  const t = data.settings.theme
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return (
    <button
      className="btn icon-only"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => update((d) => ({ ...d, settings: { ...d.settings, theme: dark ? 'light' : 'dark' } }))}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={20} />
    </button>
  )
}

export function Home({ onStart }: { onStart: () => void }) {
  const { data, update, updateRoutine, session, setSession } = useStore()
  const r = activeRoutine(data)
  const s = data.settings
  const week = workoutsThisWeek(data.history)
  const streak = weekStreak(data.history, s.weeklyGoal)
  const last = [...data.history].reverse().find((w) => w.routineId === r.id)
  const sugg = suggestions(r, last, s.units)
  const totalSets = r.exercises.reduce((a, e) => a + e.sets, 0)
  const [allSugg, setAllSugg] = useState(false)
  const shownSugg = allSugg ? sugg : sugg.slice(0, 3)
  const [openId, setOpenId] = useState<string | null>(null)

  const ws = weekStart(Date.now())
  const trained = new Set(data.history.map((w) => dayKey(w.start)))
  const today = dayKey(Date.now())
  const days = DOW.map((d, i) => {
    const dt = new Date(ws)
    dt.setDate(dt.getDate() + i)
    const k = dayKey(dt.getTime())
    return { d, done: trained.has(k), today: k === today }
  })

  const start = () => {
    unlockAudio()
    if (!session) setSession({ routineId: r.id, start: Date.now(), idx: 0, logs: {}, rest: null })
    onStart()
  }

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <span className="label">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          <h1 className="display">Today</h1>
        </div>
        <ThemeToggle />
      </header>

      {session && (
        <div className="callout">
          <Icon name="bolt" />
          <div className="grow">
            <strong>Workout in progress</strong>
            <div className="muted small">{data.routines.find((x) => x.id === session.routineId)?.name}</div>
          </div>
          <button className="btn primary sm" onClick={onStart}>
            Resume
          </button>
        </div>
      )}

      {backupDue(data) && (
        <div className="callout backup-callout" role="status">
          <Icon name="download" />
          <div className="grow">
            <strong>Back up your workouts</strong>
            <div className="muted small">
              {data.lastBackup
                ? `Last backup ${new Date(data.lastBackup).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}. Save a copy in case this phone is reset.`
                : `${data.history.length} workouts are only on this phone. Save a copy somewhere safe.`}
            </div>
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button
                className="btn primary sm"
                onClick={async () => {
                  if (await exportBackup(data)) update((d) => ({ ...d, lastBackup: Date.now(), backupSnoozeUntil: undefined }))
                }}
              >
                Export now
              </button>
              <button className="btn ghost sm" onClick={() => update((d) => ({ ...d, backupSnoozeUntil: snoozeUntil() }))}>
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="hero">
        <span className="label">Up next</span>
        <select className="hero-select" aria-label="Routine" value={r.id} onChange={(e) => update((d) => ({ ...d, activeRoutineId: e.target.value }))}>
          {data.routines.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <div className="hero-meta">
          <span>
            <b className="mono">{r.exercises.length}</b> exercise{r.exercises.length === 1 ? '' : 's'}
          </span>
          <span>
            <b className="mono">{totalSets}</b> sets
          </span>
          <span>
            ~<b className="mono">{estimateMin(r, s)}</b> min
          </span>
        </div>
        {!session && (
          <button className="btn signal xl block" disabled={r.exercises.length === 0} onClick={() => start()}>
            <Icon name="play" size={20} /> Start workout
          </button>
        )}
      </section>

      <section className="card">
        <div className="week">
          <div className="pips" aria-label={`Trained ${week} of ${s.weeklyGoal} this week`}>
            {days.map((x, i) => (
              <div key={i} className={`pip${x.done ? ' done' : ''}${x.today ? ' today' : ''}`}>
                <i />
                {x.d}
              </div>
            ))}
          </div>
        </div>
        <div className="metrics">
          <div className="metric">
            <span className="v">
              {week}
              <span className="muted">/{s.weeklyGoal}</span>
            </span>
            <span className="label">This week</span>
          </div>
          <div className="metric">
            <span className="v">
              <Icon name="flame" size={18} />
              {streak}
            </span>
            <span className="label">Wk streak</span>
          </div>
          <div className="metric">
            <span className="v">{data.history.length}</span>
            <span className="label">Sessions</span>
          </div>
        </div>
      </section>

      {sugg.length > 0 && (
        <section className="card">
          <h3 className="card-title">
            <Icon name="trend" size={18} /> Ready to progress
          </h3>
          {shownSugg.map((sg) => (
            <div key={sg.exerciseId} className="sugg">
              <div>
                <strong>{sg.name}</strong>
                <div className="muted">{sg.text}</div>
              </div>
              <button className="btn primary sm" onClick={() => updateRoutine(r.id, (rt) => ({ ...rt, exercises: rt.exercises.map((e) => (e.id === sg.exerciseId ? sg.apply(e) : e)) }))}>
                Apply
              </button>
            </div>
          ))}
          {sugg.length > 3 && (
            <button className="text-btn more-btn" onClick={() => setAllSugg(!allSugg)}>
              {allSugg ? 'Show less' : `Show all ${sugg.length}`}
            </button>
          )}
        </section>
      )}

      <div>
        <div className="section-head">
          <span className="label">Active routine</span>
          <span className="muted small">Tap to see exercises</span>
        </div>
        <RoutineCard r={r} active settings={s} history={data.history} expanded={openId === r.id} onClick={() => setOpenId(openId === r.id ? null : r.id)}>
          {r.exercises.length === 0 ? (
            <p className="muted small">No exercises yet. Add some in Routines.</p>
          ) : (
            <ol className={`ex-rows ex-preview${s.showGuides ? ' with-thumbs' : ''}`}>
              {r.exercises.map((ex, i) => (
                <li key={ex.id}>
                  {s.showGuides ? <GuideThumb ex={ex} /> : <span className="idx">{String(i + 1).padStart(2, '0')}</span>}
                  <span className="name">
                    {ex.name}
                    {ex.type === 'timed' && <span className="tag">Timed</span>}
                  </span>
                  <span className="meta">
                    {ex.sets} × {targetText(ex, s)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </RoutineCard>
      </div>
    </div>
  )
}
