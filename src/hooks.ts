import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { dayKey } from './util'

/** Re-render periodically while `active`, and whenever the tab becomes visible again. */
export function useTick(active: boolean, ms = 250) {
  const [, force] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!active) return
    const t = setInterval(force, ms)
    const vis = () => force()
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('focus', vis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('focus', vis)
    }
  }, [active, ms])
}

/**
 * Timestamp-based countdown. Remaining time is always derived from Date.now(),
 * so it stays correct when the tab is backgrounded and intervals are throttled.
 */
export function useCountdown(initialMs: number, onEnd: () => void) {
  const [st, setSt] = useState<{ endAt: number | null; remaining: number }>({ endAt: null, remaining: initialMs })
  const endRef = useRef(onEnd)
  endRef.current = onEnd
  const running = st.endAt != null
  useTick(running)
  const remaining = st.endAt == null ? st.remaining : Math.max(0, st.endAt - Date.now())

  useEffect(() => {
    if (st.endAt != null && remaining <= 0) {
      setSt({ endAt: null, remaining: 0 })
      endRef.current()
    }
  })

  const start = useCallback((ms: number) => setSt({ endAt: Date.now() + ms, remaining: ms }), [])
  const pause = useCallback(() => setSt((s) => (s.endAt == null ? s : { endAt: null, remaining: Math.max(0, s.endAt - Date.now()) })), [])
  const resume = useCallback(() => setSt((s) => (s.endAt != null || s.remaining <= 0 ? s : { endAt: Date.now() + s.remaining, remaining: s.remaining })), [])
  const reset = useCallback((ms: number) => setSt({ endAt: null, remaining: ms }), [])

  return { remaining, running, endAt: st.endAt, start, pause, resume, reset }
}

/** Keep screen on while active. Re-acquires after the tab becomes visible (locks are released when hidden). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        if (document.visibilityState === 'visible' && !cancelled) lock = await navigator.wakeLock.request('screen')
      } catch {
        /* denied or unsupported */
      }
    }
    void acquire()
    const vis = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', vis)
      void lock?.release().catch(() => {})
    }
  }, [active])
}

/** Today's local date key ("YYYY-MM-DD"). Re-renders when the date changes, e.g. a PWA left open past midnight. */
export function useToday(): string {
  const [today, setToday] = useState(() => dayKey(Date.now()))
  useEffect(() => {
    const check = () => setToday(dayKey(Date.now())) // same string = no re-render
    const t = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])
  return today
}
