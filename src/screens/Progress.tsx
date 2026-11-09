import { useMemo } from 'react'
import { Icon } from '../components/Icon'
import { PageTitle } from '../components/PageTitle'
import { bestWeekStreak, monthStats, weekStart, weekStreak, weeklyCounts } from '../logic'
import { useStore } from '../store'

const WEEKS = 8
/** Max bar height in px: .bars height (120) minus the count label above each bar. */
const BAR_H = 98

export function Progress() {
  const { data } = useStore()
  const { history, settings } = data
  const goal = settings.weeklyGoal
  const m = useMemo(() => monthStats(history), [history])
  const weeks = useMemo(() => weeklyCounts(history, WEEKS), [history])
  const streak = weekStreak(history, goal)
  const best = useMemo(() => bestWeekStreak(history, goal), [history, goal])
  const first = useMemo(() => (history.length ? weekStart(history.reduce((m, w) => Math.min(m, w.start), Infinity)) : Date.now()), [history])
  // Hit rate counts finished weeks since the first workout; the current week is still in progress.
  const done = weeks.slice(0, -1).filter((w) => w.start >= first)
  // Consistency needs at least one finished week to mean anything.
  const showConsistency = done.length > 0
  const hit = done.filter((w) => w.count >= goal).length
  const top = Math.max(goal, ...weeks.map((w) => w.count))
  const monthName = new Date().toLocaleDateString(undefined, { month: 'long' })
  const diff = m.workouts - m.prevWorkouts
  const short = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const header = <PageTitle title="Progress" />

  if (!history.length) {
    return (
      <div className="screen">
        {header}
        <div className="group empty">
          <Icon name="chart" size={36} />
          <strong>No data yet</strong>
          Finish a workout to see your monthly summary and consistency.
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      {header}

      <section className="card">
        <h3 className="card-title">{monthName}</h3>
        <div className="kpis two">
          <div className="kpi">
            <span className="label">Workouts</span>
            <span className="v">{m.workouts}</span>
            {m.hasEarlier && <span className="sub">{diff === 0 ? 'Same as last month' : `${diff > 0 ? '+' : ''}${diff} vs last month`}</span>}
          </div>
          <div className="kpi">
            <span className="label">Active days</span>
            <span className="v">{m.activeDays}</span>
          </div>
          <div className="kpi">
            <span className="label">Time trained</span>
            <span className="v">{m.minutes >= 60 ? `${Math.floor(m.minutes / 60)}h ${m.minutes % 60}m` : `${m.minutes}m`}</span>
          </div>
          <div className="kpi">
            <span className="label">Sets done</span>
            <span className="v">{m.sets}</span>
            {m.prs > 0 && <span className="sub">{m.prs} personal best{m.prs === 1 ? '' : 's'}</span>}
          </div>
        </div>
      </section>

      {showConsistency ? (
        <section className="card">
          <h3 className="card-title">Consistency</h3>
          <div className="metrics" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
            <div className="metric">
              <span className="v">
                <Icon name="flame" size={18} />
                {streak}
              </span>
              <span className="label">Wk streak</span>
            </div>
            <div className="metric">
              <span className="v">{best}</span>
              <span className="label">Best streak</span>
            </div>
            <div className="metric">
              <span className="v">
                {hit}
                <span className="muted">/{done.length}</span>
              </span>
              <span className="label">Goal weeks</span>
            </div>
          </div>

          <div className="bars" role="img" aria-label={`Workouts per week, last ${WEEKS} weeks: ${weeks.map((w) => w.count).join(', ')}. Goal ${goal}.`}>
            <div className="goal" style={{ bottom: `${(goal / top) * BAR_H}px` }} />
            {weeks.map((w, i) => (
              <div key={w.start} className={`col${i === weeks.length - 1 ? ' now' : ''}`} title={`Week of ${short(w.start)}: ${w.count}`}>
                <span className="n">{w.count}</span>
                <div className={`bar${w.count >= goal ? ' met' : ''}`} style={{ height: `${(w.count / top) * BAR_H}px` }} />
              </div>
            ))}
          </div>
          <div className="bars-x">
            <span>{short(weeks[0].start)}</span>
            <span>This week</span>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Goal: {goal} workout{goal === 1 ? '' : 's'} a week.
          </p>
        </section>
      ) : (
        <p className="muted small center" style={{ marginTop: 18 }}>
          Streaks and weekly goals show up after your first full week.
        </p>
      )}
    </div>
  )
}
