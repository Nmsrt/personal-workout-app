import type { AppData } from './types'

const DAY = 86_400_000
export const BACKUP_EVERY_DAYS = 30
export const SNOOZE_DAYS = 7
/** never backed up: start nudging after this many workouts */
export const FIRST_NUDGE_WORKOUTS = 3

/** Whether to show the backup reminder on Home. */
export function backupDue(d: AppData, now = Date.now()): boolean {
  if (d.backupSnoozeUntil && now < d.backupSnoozeUntil) return false
  if (!d.lastBackup) return d.history.length >= FIRST_NUDGE_WORKOUTS
  const newSince = d.history.some((w) => w.end > d.lastBackup!)
  return newSince && now - d.lastBackup >= BACKUP_EVERY_DAYS * DAY
}

export const snoozeUntil = (now = Date.now()) => now + SNOOZE_DAYS * DAY

const fileName = () => `workout-backup-${new Date().toISOString().slice(0, 10)}.json`

/**
 * Save a backup file. On phones this opens the share sheet (save to Files/Drive,
 * send to yourself); elsewhere it downloads. Resolves true if the backup was saved
 * or shared, false if the user cancelled.
 */
export async function exportBackup(d: AppData): Promise<boolean> {
  const json = JSON.stringify(d, null, 2)
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  if (touch && typeof navigator.share === 'function' && typeof File === 'function') {
    const file = new File([json], fileName(), { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Workout backup' })
        return true
      } catch (e) {
        if ((e as Error).name === 'AbortError') return false
        // fall through to a normal download if sharing fails for another reason
      }
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  a.download = fileName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return true
}

/* ───────── Persistent storage ───────── */

export type PersistState = 'granted' | 'denied' | 'unsupported'

export async function persistState(): Promise<PersistState> {
  try {
    if (!navigator.storage?.persisted) return 'unsupported'
    return (await navigator.storage.persisted()) ? 'granted' : 'denied'
  } catch {
    return 'unsupported'
  }
}

/** Ask the browser not to evict this app's data under storage pressure. */
export async function requestPersist(): Promise<PersistState> {
  try {
    if (!navigator.storage?.persist) return 'unsupported'
    if (await navigator.storage.persisted()) return 'granted'
    return (await navigator.storage.persist()) ? 'granted' : 'denied'
  } catch {
    return 'unsupported'
  }
}

/** Characters used by saved data vs the ~5M-character localStorage budget. */
export function storageUsage(): { used: number; pct: number } {
  let used = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) used += k.length + (localStorage.getItem(k)?.length ?? 0)
    }
  } catch {
    /* ignore */
  }
  return { used, pct: Math.min(100, (used / 5_000_000) * 100) }
}

export const fmtBytes = (chars: number) => (chars < 1024 * 1024 ? `${Math.max(1, Math.round(chars / 1024))} KB` : `${(chars / 1024 / 1024).toFixed(1)} MB`)
