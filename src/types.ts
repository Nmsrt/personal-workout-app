export type ExType = 'reps' | 'timed'

export interface Exercise {
  id: string
  name: string
  type: ExType
  sets: number
  repMin: number
  repMax: number
  /** always stored in kg */
  weight: number
  /** seconds, for timed exercises */
  duration: number
  /** seconds; null = use default rest from settings */
  rest: number | null
  notes: string
  /** illustration key; undefined = auto-detect from name, 'none' = hide */
  illustration?: string
  /** user photo as a compressed JPEG data URL */
  photo?: string
}

export interface Routine {
  id: string
  name: string
  exercises: Exercise[]
  /** weekdays this routine is planned for, 0 = Monday … 6 = Sunday; missing/empty = not scheduled */
  days?: number[]
}

export interface Settings {
  sound: boolean
  vibration: boolean
  defaultRest: number
  getReady: number
  units: 'kg' | 'lb'
  weeklyGoal: number
  theme: 'auto' | 'light' | 'dark'
  reminderOn: boolean
  reminderTime: string
  showGuides: boolean
  /** auto = break starts after each set; manual = tap to start it */
  restMode: 'auto' | 'manual'
}

export interface SetLog {
  reps: number
  /** kg */
  weight: number
  /** seconds actually held (timed) */
  duration: number
}

export interface ExerciseLog {
  exerciseId: string
  name: string
  type: ExType
  targetRepMax: number
  targetWeight: number
  targetDuration: number
  targetSets: number
  sets: SetLog[]
}

export interface Workout {
  id: string
  routineId: string
  routineName: string
  start: number
  end: number
  exercises: ExerciseLog[]
  prs: string[]
}

export interface Session {
  routineId: string
  start: number
  idx: number
  /** key = `${exerciseId}:${setIdx}` */
  logs: Record<string, SetLog>
  /** pending = manual mode, waiting for the user to start the break */
  rest: { endAt: number; total: number; pending?: boolean } | null
  /** step layout version `idx` refers to; missing = legacy (may include warm-up steps) */
  layout?: number
}

export interface AppData {
  version: 1
  routines: Routine[]
  activeRoutineId: string
  history: Workout[]
  settings: Settings
  /** version of built-in routine set already offered to this user */
  presets?: number
  /** ms timestamp of the last successful export */
  lastBackup?: number
  /** backup reminder hidden until this ms timestamp */
  backupSnoozeUntil?: number
  /** built-in routine ids that were missing when the user dismissed the Restore prompt */
  restoreDismissed?: string[]
  /** day key (YYYY-MM-DD) when Home last auto-picked today's scheduled routine */
  autoPickDay?: string
}

export type Step = { exIdx: number; setIdx: number }
