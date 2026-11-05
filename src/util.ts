import type { Settings } from './types'

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export function fmtTime(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export const KG_PER_LB = 0.45359237
const round1 = (n: number) => Math.round(n * 10) / 10

export const toDisp = (kg: number, u: Settings['units']) => round1(u === 'kg' ? kg : kg / KG_PER_LB)
export const fromDisp = (v: number, u: Settings['units']) => Math.round((u === 'kg' ? v : v * KG_PER_LB) * 1000) / 1000
export const fmtW = (kg: number, u: Settings['units']) => `${toDisp(kg, u)} ${u}`

export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Call from a user gesture so later beeps are allowed on mobile. */
export function unlockAudio() {
  audio()
}

export type Cue = 'tick' | 'go' | 'end'

/** [frequency Hz, offset s, duration s, volume, wave] */
type Note = [number, number, number, number, OscillatorType]
const CUES: Record<Cue, Note[]> = {
  tick: [[1046, 0, 0.09, 0.16, 'sine']],
  go: [
    [784, 0, 0.12, 0.28, 'triangle'],
    [1175, 0.11, 0.28, 0.3, 'triangle']
  ],
  end: [
    [784, 0, 0.18, 0.34, 'triangle'],
    [988, 0.15, 0.18, 0.34, 'triangle'],
    [1319, 0.3, 0.6, 0.38, 'triangle'],
    [1568, 0.3, 0.6, 0.12, 'sine']
  ]
}

const noop = () => {}

/**
 * Schedule a cue on the audio clock at wall-clock time `atMs`.
 * Audio-clock scheduling keeps playing on time even if the tab is backgrounded.
 * The returned cancel only silences notes that haven't started yet.
 */
export function scheduleCue(s: Settings, kind: Cue, atMs: number): () => void {
  if (!s.sound) return noop
  const c = audio()
  if (!c) return noop
  const t0 = c.currentTime + Math.max(0, (atMs - Date.now()) / 1000)
  const oscs = CUES[kind].map(([f, off, dur, vol, wave]) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = wave
    o.frequency.value = f
    o.connect(g)
    g.connect(c.destination)
    const t = t0 + off
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.start(t)
    o.stop(t + dur + 0.02)
    return { o, t }
  })
  return () => {
    for (const { o, t } of oscs) {
      if (c.currentTime < t) {
        try {
          o.stop()
        } catch {
          /* already stopped */
        }
      }
    }
  }
}

/** Ticks for the last `ticks` seconds, then the final cue, for a countdown ending at `endAt`. */
export function scheduleCountdown(s: Settings, endAt: number, final: 'go' | 'end', ticks = 3): () => void {
  const cancels: (() => void)[] = []
  const now = Date.now()
  for (let i = ticks; i >= 1; i--) {
    const at = endAt - i * 1000
    if (at > now - 50) cancels.push(scheduleCue(s, 'tick', at))
  }
  cancels.push(scheduleCue(s, final, endAt))
  return () => cancels.forEach((c) => c())
}

export function vibrateCue(s: Settings, kind: Cue) {
  if (!s.vibration || !('vibrate' in navigator)) return
  navigator.vibrate(kind === 'end' ? [220, 90, 220, 90, 450] : kind === 'go' ? [120, 60, 120] : 30)
}

/** Play a cue right now (sound + vibration). */
export function alertUser(s: Settings, long = false) {
  const kind: Cue = long ? 'end' : 'go'
  scheduleCue(s, kind, Date.now())
  vibrateCue(s, kind)
}

/** Downscale an image file to a JPEG data URL (keeps localStorage use small). */
export async function compressImage(file: File, maxSide = 640, quality = 0.78): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Could not read that image'))
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.naturalWidth * scale))
    c.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}
