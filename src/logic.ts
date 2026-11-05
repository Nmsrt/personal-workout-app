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
  if (s.useWarmup) sec += r.warmup.reduce((a, x) => a + x.duration, 0)
  if (s.useCooldown) sec += r.cooldown.reduce((a, x) => a + x.duration, 0)
  return Math.max(1, Math.round(sec / 60))
}

export function buildSteps(r: Routine, s: Pick<Settings, 'useWarmup' | 'useCooldown'>): Step[] {
  const steps: Step[] = []
  if (s.useWarmup) r.warmup.forEach((stretch) => steps.push({ kind: 'warm', stretch }))
  r.exercises.forEach((ex, exIdx) => {
    for (let setIdx = 0; setIdx < ex.sets; setIdx++) steps.push({ kind: 'set', exIdx, setIdx })
  })
  if (s.useCooldown) r.cooldown.forEach((stretch) => steps.push({ kind: 'cool', stretch }))
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
  const counts = new Map<number, number>()
  for (const w of history) {
    const k = weekStart(w.start)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
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

export interface ExerciseSummary {
  id: string
  name: string
  type: Exercise['type']
  points: { t: number; topWeight: number; totalReps: number; best: number }[]
  pr: { score: number; set: { reps: number; weight: number; duration: number }; t: number } | null
}

export function exerciseSeries(history: Workout[]): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary>()
  const sorted = [...history].sort((a, b) => a.start - b.start)
  for (const w of sorted) {
    for (const log of w.exercises) {
      let s = map.get(log.exerciseId)
      if (!s) {
        s = { id: log.exerciseId, name: log.name, type: log.type, points: [], pr: null }
        map.set(log.exerciseId, s)
      }
      s.name = log.name
      s.points.push({
        t: w.start,
        topWeight: Math.max(0, ...log.sets.map((x) => x.weight)),
        totalReps: log.sets.reduce((a, x) => a + x.reps, 0),
        best: log.type === 'timed' ? Math.max(0, ...log.sets.map((x) => x.duration)) : bestScore(log)
      })
      for (const set of log.sets) {
        const sc = setScore(log.type, set)
        if (!s.pr || sc > s.pr.score) s.pr = { score: sc, set, t: w.start }
      }
    }
  }
  return [...map.values()]
}
