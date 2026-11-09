import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { requestPersist } from './backup'
import { checkReminder } from './reminders'
import { FigureGallery } from './screens/FigureGallery'
import { Home } from './screens/Home'
import { History } from './screens/History'
import { Progress } from './screens/Progress'
import { Routines } from './screens/Routines'
import { SettingsScreen } from './screens/SettingsScreen'
import { WorkoutScreen } from './screens/WorkoutScreen'
import { useStore } from './store'

/** 'settings' is reached from the profile button on Home, not the tab bar. */
type Tab = 'home' | 'routines' | 'history' | 'progress' | 'settings'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'routines', label: 'Routines', icon: 'list' },
  { id: 'history', label: 'History', icon: 'calendar' },
  { id: 'progress', label: 'Progress', icon: 'chart' }
]

function useTheme(pref: 'auto' | 'light' | 'dark') {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'auto' && mq.matches)
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e0f0c' : '#ffffff')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])
}

export function App() {
  const { data, session } = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [inWorkout, setInWorkout] = useState(() => !!session)
  useTheme(data.settings.theme)

  useEffect(() => {
    void checkReminder(data)
    const id = setInterval(() => void checkReminder(data), 60_000)
    return () => clearInterval(id)
  }, [data])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, inWorkout])

  // ask the browser to keep our data even when the device is low on space
  useEffect(() => {
    void requestPersist()
  }, [])

  if (location.hash === '#figures') return <FigureGallery />
  if (inWorkout) return <WorkoutScreen onExit={() => { setInWorkout(false); setTab('home') }} />

  return (
    <div className="app">
      <main key={tab}>
        {tab === 'home' && <Home onStart={() => setInWorkout(true)} onProfile={() => setTab('settings')} />}
        {tab === 'routines' && <Routines />}
        {tab === 'history' && <History />}
        {tab === 'progress' && <Progress />}
        {tab === 'settings' && <SettingsScreen onBack={() => setTab('home')} />}
      </main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <span className="pill">
              <Icon name={t.icon} size={20} />
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
