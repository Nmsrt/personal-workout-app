import type { AppData } from './types'
import { dayKey } from './util'

const KEY = 'wt.reminded'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

/**
 * Browsers can't schedule local notifications without a push server, so this
 * fires while the app (or installed PWA) is open/backgrounded: once per day,
 * after the chosen time, only if no workout was logged today.
 */
export async function checkReminder(d: AppData, now = Date.now()) {
  const s = d.settings
  if (!s.reminderOn || !notificationsSupported() || Notification.permission !== 'granted') return
  const today = dayKey(now)
  if (localStorage.getItem(KEY) === today) return
  const [h, m] = s.reminderTime.split(':').map(Number)
  const at = new Date(now)
  at.setHours(h || 0, m || 0, 0, 0)
  if (now < at.getTime()) return
  if (d.history.some((w) => dayKey(w.start) === today)) return
  localStorage.setItem(KEY, today)
  const title = 'Time to work out 💪'
  const body = 'Your routine is waiting. Keep the streak going!'
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, icon: 'icon-192.png', tag: 'daily-reminder' })
    else new Notification(title, { body, icon: 'icon-192.png' })
  } catch {
    /* ignore */
  }
}
