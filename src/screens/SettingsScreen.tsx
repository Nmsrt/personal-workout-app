import { useEffect, useRef, useState, type ReactNode } from 'react'
import { exportBackup, fmtBytes, persistState, requestPersist, storageUsage, type PersistState } from '../backup'
import { Icon } from '../components/Icon'
import { NumInput, Switch } from '../components/NumInput'
import { notificationsSupported } from '../reminders'
import { normalize, useStore } from '../store'
import type { Settings } from '../types'
import { alertUser, unlockAudio } from '../util'

function Row({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="row-item">
      <div className="grow">
        <div className="title">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {children}
    </div>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="section-head">
        <span className="label">{label}</span>
      </div>
      <div className="group">{children}</div>
    </div>
  )
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label} style={{ minWidth: 168 }}>
      {options.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  )
}

export function SettingsScreen() {
  const { data, update } = useStore()
  const s = data.settings
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const set = (p: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...p } }))

  const [persist, setPersist] = useState<PersistState | 'checking'>('checking')
  useEffect(() => {
    void persistState().then(setPersist)
  }, [])
  const usage = storageUsage()

  const exportJson = async () => {
    if (await exportBackup(data)) {
      update((d) => ({ ...d, lastBackup: Date.now(), backupSnoozeUntil: undefined }))
      setMsg('Backup saved.')
    }
  }
  const protect = async () => {
    const r = await requestPersist()
    setPersist(r)
    setMsg(r === 'granted' ? 'Storage protected.' : r === 'denied' ? 'The browser declined for now. Installing the app to your home screen usually allows it.' : 'This browser does not support protected storage.')
  }
  const importJson = async (f: File) => {
    try {
      const next = normalize(JSON.parse(await f.text()))
      if (!confirm(`Import ${next.routines.length} routine(s) and ${next.history.length} workout(s)? This replaces current data.`)) return
      update(() => ({ ...next, lastBackup: Date.now(), backupSnoozeUntil: undefined }))
      setMsg('Backup imported.')
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`)
    }
  }
  const toggleReminder = async (on: boolean) => {
    if (on && notificationsSupported() && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission()
      if (p !== 'granted') {
        setMsg('Notifications are blocked by the browser.')
        return
      }
    }
    set({ reminderOn: on })
  }

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <span className="label">Preferences</span>
          <h1 className="display">Settings</h1>
        </div>
      </header>

      <Section label="Appearance">
        <Row title="Theme">
          <Seg label="Theme" value={s.theme} onChange={(theme) => set({ theme })} options={[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']]} />
        </Row>
        <Row title="Units">
          <Seg label="Units" value={s.units} onChange={(units) => set({ units })} options={[['kg', 'kg'], ['lb', 'lb']]} />
        </Row>
      </Section>

      <Section label="Workout">
        <Row title="Default rest" sub="Used when an exercise has no rest set">
          <NumInput className="input" value={s.defaultRest} max={900} onChange={(v) => set({ defaultRest: v ?? 0 })} ariaLabel="Default rest" />
        </Row>
        <Row title="Get-ready countdown" sub="Seconds before timed exercises">
          <NumInput className="input" value={s.getReady} max={30} onChange={(v) => set({ getReady: v ?? 0 })} ariaLabel="Get ready seconds" />
        </Row>
        <Row title="Break timer" sub={s.restMode === 'manual' ? 'Tap “Start break” after each set' : 'Starts automatically after each set'}>
          <Seg label="Break timer" value={s.restMode} onChange={(restMode) => set({ restMode })} options={[['manual', 'Manual'], ['auto', 'Auto']]} />
        </Row>
        <Row title="Form guides" sub="Animated demos and your photos">
          <Switch label="Form guides" checked={s.showGuides} onChange={(v) => set({ showGuides: v })} />
        </Row>
        <Row title="Warm-up stretches" sub="Before the first exercise">
          <Switch label="Warm-up stretches" checked={s.useWarmup} onChange={(v) => set({ useWarmup: v })} />
        </Row>
        <Row title="Cool-down stretches" sub="After the last exercise">
          <Switch label="Cool-down stretches" checked={s.useCooldown} onChange={(v) => set({ useCooldown: v })} />
        </Row>
      </Section>

      <Section label="Feedback">
        <Row title="Sound">
          <Switch label="Sound" checked={s.sound} onChange={(v) => set({ sound: v })} />
        </Row>
        <Row title="Vibration" sub="Android only">
          <Switch label="Vibration" checked={s.vibration} onChange={(v) => set({ vibration: v })} />
        </Row>
        <Row title="Test alert">
          <button className="btn soft sm" onClick={() => { unlockAudio(); alertUser(s, true) }}>
            Play
          </button>
        </Row>
      </Section>

      <Section label="Goals & reminders">
        <Row title="Weekly goal" sub="Workouts per week">
          <NumInput className="input" value={s.weeklyGoal} min={1} max={14} onChange={(v) => set({ weeklyGoal: v ?? 1 })} ariaLabel="Weekly goal" />
        </Row>
        {notificationsSupported() ? (
          <>
            <Row title="Daily reminder" sub="If you haven't trained yet that day">
              <Switch label="Daily reminder" checked={s.reminderOn} onChange={(v) => void toggleReminder(v)} />
            </Row>
            {s.reminderOn && (
              <Row title="Remind after">
                <input className="input" type="time" aria-label="Reminder time" value={s.reminderTime} onChange={(e) => set({ reminderTime: e.target.value })} />
              </Row>
            )}
          </>
        ) : (
          <Row title="Daily reminder" sub="Not supported in this browser">
            <span />
          </Row>
        )}
      </Section>

      <Section label="Backup & storage">
        <Row
          title="Storage"
          sub={`${persist === 'granted' ? 'Protected' : persist === 'denied' ? 'Not protected: the browser may clear it if space runs low' : persist === 'unsupported' ? 'Protection not supported here' : 'Checking…'} · ${fmtBytes(usage.used)} used (${usage.pct < 1 ? '<1' : Math.round(usage.pct)}%)`}
        >
          {persist === 'granted' ? (
            <span className="tag storage-ok">
              <Icon name="check" size={12} stroke={3} /> Safe
            </span>
          ) : persist === 'denied' ? (
            <button className="btn soft sm" onClick={() => void protect()}>
              Protect
            </button>
          ) : (
            <span />
          )}
        </Row>
        <Row title="Export data" sub={data.lastBackup ? `Last backup ${new Date(data.lastBackup).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Never backed up'}>
          <button className="btn soft sm" onClick={() => void exportJson()}>
            <Icon name="download" size={16} /> Export
          </button>
        </Row>
        <Row title="Import data" sub="Replaces everything on this device">
          <button className="btn soft sm" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> Import
          </button>
        </Row>
      </Section>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importJson(f)
          e.target.value = ''
        }}
      />
      {msg && (
        <p className="muted small center" role="status" style={{ marginTop: 12 }}>
          {msg}
        </p>
      )}
    </div>
  )
}
