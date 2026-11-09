import { useEffect } from 'react'
import { backupDue, exportBackup, snoozeUntil } from '../backup'
import { Icon } from '../components/Icon'
import { useToday } from '../hooks'
import { DAY_LETTERS, DAY_NAMES, estimateMin, scheduledOn, weekStart, weekStreak, workoutsThisWeek } from '../logic'
import { activeRoutine, SESSION_LAYOUT, useStore } from '../store'
import { dayKey, unlockAudio } from '../util'

export function ThemeToggle() {
  const { data, update } = useStore()
  const t = data.settings.theme
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return (
    <button
      className="btn icon-only ghost"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => update((d) => ({ ...d, settings: { ...d.settings, theme: dark ? 'light' : 'dark' } }))}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={20} />
    </button>
  )
}

export function Home({ onStart, onProfile }: { onStart: () => void; onProfile: () => void }) {
  const { data, update, session, setSession } = useStore()
  // While a workout runs, the hero shows that routine, not the one picked for later.
  const picked = activeRoutine(data)
  const s = data.settings
  const week = workoutsThisWeek(data.history)
  const streak = weekStreak(data.history, s.weeklyGoal)

  const today = useToday()
  const ws = weekStart(Date.now())
  const trained = new Set(data.history.map((w) => dayKey(w.start)))
  const trainedToday = trained.has(today)
  const plannedDays = new Set(data.routines.flatMap((x) => x.days ?? []))
  const days = DAY_LETTERS.map((d, i) => {
    const dt = new Date(ws)
    dt.setDate(dt.getDate() + i)
    const k = dayKey(dt.getTime())
    return { d, done: trained.has(k), today: k === today, planned: plannedDays.has(i) }
  })
  const plannedToday = scheduledOn(data.routines, Date.now())
  const plannedIds = new Set(plannedToday.map((x) => x.id))
  // Nothing scheduled today and no workout running: the hero says so instead of pushing a routine.
  const restDay = !session && plannedToday.length === 0
  // Hero routine: the running one, else the picked one if it's planned today, else the first planned today.
  const r = (session && data.routines.find((x) => x.id === session.routineId)) || (plannedIds.has(picked.id) ? picked : plannedToday[0] ?? picked)
  const totalSets = r.exercises.reduce((a, e) => a + e.sets, 0)

  // This week's plan: what's planned each day, and what was actually done.
  const anyPlanned = data.routines.some((x) => x.days?.length)
  const plan = DAY_NAMES.map((name, i) => {
    const dt = new Date(ws)
    dt.setDate(dt.getDate() + i)
    const k = dayKey(dt.getTime())
    const did = data.history.filter((w) => dayKey(w.start) === k)
    const planned = data.routines.filter((x) => x.days?.includes(i))
    const status = did.length ? 'done' : k === today ? 'today' : k < today && planned.length ? 'missed' : planned.length ? 'planned' : 'rest'
    const names = did.length ? [...new Set(did.map((w) => w.routineName))] : planned.map((x) => x.name || 'Untitled')
    return { name, short: name.slice(0, 3), status, names, isToday: k === today }
  })

  // Once per day, make today's planned routine the one up next. A manual pick after that sticks.
  // Waits while a workout is running so it doesn't swap the routine out from under it.
  const running = !!session
  useEffect(() => {
    if (running || data.autoPickDay === today) return
    update((d) => {
      const pick = scheduledOn(d.routines, Date.now())[0]
      return { ...d, autoPickDay: today, activeRoutineId: pick ? pick.id : d.activeRoutineId }
    })
  }, [today, data.autoPickDay, running, update])
  const left = Math.max(0, s.weeklyGoal - week)
  const due = backupDue(data)

  const start = () => {
    unlockAudio()
    if (!session) setSession({ routineId: r.id, start: Date.now(), idx: 0, logs: {}, rest: null, layout: SESSION_LAYOUT })
    onStart()
  }

  return (
    <div className="screen home">
      <header className="topbar">
        <div className="home-id">
          <button className="avatar" aria-label={due ? 'Profile and settings, backup due' : 'Profile and settings'} onClick={onProfile}>
            <Icon name="user" size={20} />
            {due && <span className="avatar-dot" aria-hidden />}
          </button>
          <h1 className="sr-only">Home</h1>
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

      <section className="hero">
        <p className="hero-date">
          <time dateTime={today}>
            <b>{new Date().toLocaleDateString(undefined, { weekday: 'long' })}</b>, {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
          </time>
        </p>
        {restDay ? (
          <>
            <span className="label">{trainedToday ? 'Trained today' : 'Rest day'}</span>
            <h2 className="hero-title">No session today</h2>
            <p className="hero-note">{trainedToday ? 'Nothing else planned. Good work, now recover.' : 'Nothing planned for today. Rest up and recover.'}</p>
          </>
        ) : (
          <>
            <span className="label">{session ? 'In progress' : trainedToday ? 'Trained today · Up next' : plannedIds.has(r.id) ? 'Planned for today' : 'Up next'}</span>
            <h2 className="hero-title">{r.name || 'Untitled'}</h2>
            {!session && plannedToday.length > 1 && (
              <div className="hero-chips" role="radiogroup" aria-label="Today's routines">
                {plannedToday.map((x) => (
                  <button key={x.id} role="radio" aria-checked={x.id === r.id} className={x.id === r.id ? 'on' : ''} onClick={() => update((d) => ({ ...d, activeRoutineId: x.id }))}>
                    {x.name || 'Untitled'}
                  </button>
                ))}
              </div>
            )}
            <div className="hero-meta">
              <span>
                <b>{r.exercises.length}</b> exercise{r.exercises.length === 1 ? '' : 's'}
              </span>
              <span aria-hidden>·</span>
              <span>
                <b>{totalSets}</b> sets
              </span>
              <span aria-hidden>·</span>
              <span>
                ~<b>{estimateMin(r, s)}</b> min
              </span>
            </div>
            {!session && (
              <button className="btn signal lg block" disabled={r.exercises.length === 0} onClick={() => start()}>
                <Icon name="play" size={18} /> Start workout
              </button>
            )}
          </>
        )}
      </section>

      <section className="card week-card" aria-label="This week">
        <div className="week-head">
          <div>
            <strong>
              {week} of {s.weeklyGoal} workouts
            </strong>
            <div className="muted small">{left === 0 ? 'Weekly goal reached' : `${left} more to hit your goal`}</div>
          </div>
          {streak > 0 && (
            <span className="streak" title="Weeks in a row meeting your goal">
              <Icon name="flame" size={16} />
              {streak} wk
            </span>
          )}
        </div>
        <div className="pips" aria-hidden>
          {days.map((x, i) => (
            <div key={i} className={`pip${x.done ? ' done' : ''}${x.today ? ' today' : ''}${x.planned ? ' planned' : ''}`}>
              <i />
              {x.d}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <span className="label">This week's plan</span>
        </div>
        {anyPlanned ? (
          <ol className="group week-plan" aria-label="This week's plan">
            {plan.map((p) => (
              <li key={p.name} className={`wp-row ${p.status}${p.isToday ? ' is-today' : ''}`}>
                <span className="wp-day">{p.short}</span>
                <span className="wp-name">{p.names.length ? p.names.join(' + ') : 'Rest'}</span>
                <span className="wp-status">
                  {p.status === 'done' ? (
                    <>
                      <Icon name="check" size={14} stroke={2.6} /> Done
                    </>
                  ) : p.status === 'today' ? (
                    'Today'
                  ) : p.status === 'missed' ? (
                    'Missed'
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="group empty">
            <Icon name="calendar" size={32} />
            <strong>No days planned</strong>
            Open a routine in Routines and pick its days to build your week.
          </div>
        )}
      </section>

      {due && (
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
    </div>
  )
}
