import type { Exercise, ExerciseLog, Routine, Session, Settings, Step, Workout } from './types'
import { uid } from './util'

export const restFor = (ex: Exercise, s: Settings) => (ex.rest == null ? s.defaultRest : ex.rest)

/** Rough session length in minutes (≈3.5 s per rep plus rests). */
export function estimateMin(r: Routine, s: Settings): number {
  let sec = 0
  r.exercises.forEach((ex, i) => {
    const work = ex.type === 'timed' ? ex.duration : Math.max(ex.repMax, 1) * 3.5
    sec += ex.sets * work + Math.max(0, ex.sets - 1) * restFor(ex, s)
    if (i < r.exercises.length - 1) sec += restFor(ex, s)
  })
  return Math.max(1, Math.round(sec / 60))
}

export function buildSteps(r: Routine): Step[] {
  const steps: Step[] = []
  r.exercises.forEach((ex, exIdx) => {
    for (let setIdx = 0; setIdx < ex.sets; setIdx++) steps.push({ exIdx, setIdx })
  })
  return steps
}

export const logKey = (exId: string, setIdx: number) => `${exId}:${setIdx}`

/** Score used for PRs and charts. Weighted: Epley 1RM estimate. Bodyweight: reps. Timed: seconds. */
export function setScore(type: Exercise['type'], s: { reps: number; weight: number; duration: number }): number {
  if (type === 'timed') return s.duration
  if (s.weight > 0) return s.weight * (1 + s.reps / 30)
  return s.reps
}

export const bestScore = (log: ExerciseLog) => Math.max(0, ...log.sets.map((s) => setScore(log.type, s)))

/** Names of exercises whose best set beats every prior workout. Needs at least one prior record. */
export function computePRs(prior: Workout[], logs: ExerciseLog[]): string[] {
  const out: string[] = []
  for (const log of logs) {
    if (!log.sets.length) continue
    const prev = prior.flatMap((w) => w.exercises.filter((e) => e.exerciseId === log.exerciseId))
    if (!prev.length) continue
    const prevBest = Math.max(...prev.map(bestScore))
    if (bestScore(log) > prevBest + 1e-9) out.push(log.name)
  }
  return out
}

export function buildWorkout(r: Routine, session: Session, end: number, history: Workout[]): Workout {
  const exercises: ExerciseLog[] = r.exercises
    .map((ex) => {
      const sets = []
      for (let i = 0; i < Math.max(ex.sets, 20); i++) {
        const l = session.logs[logKey(ex.id, i)]
        if (l) sets.push(l)
      }
      return {
        exerciseId: ex.id,
        name: ex.name,
        type: ex.type,
        targetRepMax: ex.repMax,
        targetWeight: ex.weight,
        targetDuration: ex.duration,
        targetSets: ex.sets,
        sets
      }
    })
    .filter((e) => e.sets.length > 0)
  return {
    id: uid(),
    routineId: r.id,
    routineName: r.name,
    start: session.start,
    end,
    exercises,
    prs: computePRs(history, exercises)
  }
}

export interface Suggestion {
  exerciseId: string
  name: string
  text: string
  apply: (ex: Exercise) => Exercise
}

/** Suggest progression when every target set hit the top of the range (and the target hasn't changed since). */
export function suggestions(r: Routine, last: Workout | undefined, units: Settings['units']): Suggestion[] {
  if (!last) return []
  const out: Suggestion[] = []
  for (const log of last.exercises) {
    const ex = r.exercises.find((e) => e.id === log.exerciseId)
    if (!ex || log.sets.length < log.targetSets) continue
    if (ex.type === 'timed') {
      if (ex.duration !== log.targetDuration) continue
      if (log.sets.every((s) => s.duration >= log.targetDuration)) {
        out.push({ exerciseId: ex.id, name: ex.name, text: `Held ${log.targetDuration}s every set. Go to ${ex.duration + 5}s?`, apply: (e) => ({ ...e, duration: e.duration + 5 }) })
      }
      continue
    }
    if (ex.repMax !== log.targetRepMax || ex.weight !== log.targetWeight) continue
    if (!log.sets.every((s) => s.reps >= log.targetRepMax)) continue
    if (ex.weight > 0) {
      const step = units === 'kg' ? 1 : 2.5 * 0.45359237
      out.push({
        exerciseId: ex.id,
        name: ex.name,
        text: `Hit ${log.targetRepMax} reps on all sets. Add weight (+${units === 'kg' ? '1 kg' : '2.5 lb'})?`,
        apply: (e) => ({ ...e, weight: Math.round((e.weight + step) * 1000) / 1000 })
      })
    } else {
      out.push({ exerciseId: ex.id, name: ex.name, text: `Hit ${log.targetRepMax} reps on all sets. Raise to ${ex.repMin + 2}-${ex.repMax + 2}?`, apply: (e) => ({ ...e, repMin: e.repMin + 2, repMax: e.repMax + 2 }) })
    }
  }
  return out
}

/** Weekday labels, Monday first (index = weekday index). */
export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Weekday index with Monday = 0 … Sunday = 6. */
export const weekdayIndex = (ts: number) => (new Date(ts).getDay() + 6) % 7

/** Routines planned for the weekday of `ts`, in their list order. */
export function scheduledOn<T extends Pick<Routine, 'days'>>(routines: T[], ts: number): T[] {
  const d = weekdayIndex(ts)
  return routines.filter((r) => r.days?.includes(d))
}

/** Short label for a set of weekdays: "Mon, Wed, Fri", "Weekdays", "Every day", or "" when unscheduled. Expects `days` unique and sorted (the store keeps them that way). */
export function formatDays(days: number[] | undefined): string {
  const set = days ?? []
  if (set.length === 0) return ''
  if (set.length === 7) return 'Every day'
  if (set.join() === '0,1,2,3,4') return 'Weekdays'
  if (set.join() === '5,6') return 'Weekends'
  return set.map((d) => DAY_SHORT[d]).join(', ')
}

/** Monday 00:00 local of the week containing ts. */
export function weekStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d.getTime()
}

export function workoutsThisWeek(history: Workout[], now = Date.now()): number {
  const ws = weekStart(now)
  return history.filter((w) => w.start >= ws).length
}

/** Consecutive weeks meeting the weekly goal. Current week counts once met; an unmet current week doesn't break it. */
export function weekStreak(history: Workout[], goal: number, now = Date.now()): number {
  const counts = countByWeek(history)
  let streak = 0
  let ws = weekStart(now)
  if ((counts.get(ws) ?? 0) >= goal) streak++
  const d = new Date(ws)
  for (;;) {
    d.setDate(d.getDate() - 7)
    ws = weekStart(d.getTime())
    if ((counts.get(ws) ?? 0) >= goal) streak++
    else break
  }
  return streak
}

/** Totals for the calendar month containing `now`. */
export function monthStats(history: Workout[], now = Date.now()) {
  const d = new Date(now)
  const from = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
  const prevFrom = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime()
  const inMonth = history.filter((w) => w.start >= from && w.start < to)
  const days = new Set(inMonth.map((w) => new Date(w.start).toDateString()))
  return {
    workouts: inMonth.length,
    prevWorkouts: history.filter((w) => w.start >= prevFrom && w.start < from).length,
    activeDays: days.size,
    minutes: Math.round(inMonth.reduce((a, w) => a + Math.max(0, w.end - w.start), 0) / 60000),
    sets: inMonth.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0),
    prs: inMonth.reduce((a, w) => a + w.prs.length, 0),
    /** any workout before this month, so a month-over-month delta means something */
    hasEarlier: history.some((w) => w.start < from)
  }
}

function countByWeek(history: Workout[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const w of history) {
    const k = weekStart(w.start)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

/** Workout counts for the last `n` weeks, oldest first, current week last. */
export function weeklyCounts(history: Workout[], n: number, now = Date.now()): { start: number; count: number }[] {
  const counts = countByWeek(history)
  const out: { start: number; count: number }[] = []
  const d = new Date(weekStart(now))
  for (let i = 0; i < n; i++) {
    const k = weekStart(d.getTime())
    out.unshift({ start: k, count: counts.get(k) ?? 0 })
    d.setDate(d.getDate() - 7)
  }
  return out
}

/** Longest run of consecutive weeks meeting the goal, across all history. */
export function bestWeekStreak(history: Workout[], goal: number): number {
  if (!history.length) return 0
  const counts = countByWeek(history)
  const last = Math.max(...counts.keys())
  const d = new Date(Math.min(...counts.keys()))
  let best = 0
  let run = 0
  for (let k = weekStart(d.getTime()); k <= last; d.setDate(d.getDate() + 7), k = weekStart(d.getTime())) {
    run = (counts.get(k) ?? 0) >= goal ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}
