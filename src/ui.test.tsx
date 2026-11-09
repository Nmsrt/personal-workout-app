// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { defaultData } from './seed'
import { StoreProvider } from './store'
import type { AppData, Workout } from './types'

const KEY = 'wt.data.v1'
const DAY = 86400000

function savedData(): AppData {
  return JSON.parse(localStorage.getItem(KEY) ?? 'null') as AppData
}

function yesterdayWorkout(): Workout {
  const start = Date.now() - DAY
  return {
    id: 'w-yesterday',
    routineId: 'seed-upper-body',
    routineName: 'Upper Body & Posture',
    start,
    end: start + 30 * 60000,
    prs: [],
    exercises: [
      {
        exerciseId: 's1',
        name: 'Goblet squats',
        type: 'reps',
        targetRepMax: 12,
        targetWeight: 4,
        targetDuration: 30,
        targetSets: 2,
        sets: [
          { reps: 12, weight: 4, duration: 0 },
          { reps: 11, weight: 4, duration: 0 }
        ]
      }
    ]
  }
}

function mount(data?: AppData) {
  if (data) localStorage.setItem(KEY, JSON.stringify(data))
  return render(
    <StoreProvider>
      <App />
    </StoreProvider>
  )
}

/** Plans the default routine for every day so Home offers Start workout. */
function everyDay(d: AppData): AppData {
  return { ...d, routines: d.routines.map((r) => (r.id === 'seed-upper-body' ? { ...r, days: [0, 1, 2, 3, 4, 5, 6] } : r)) }
}

const tabbar = () => within(screen.getByRole('navigation', { name: 'Main' }))

beforeEach(() => {
  localStorage.clear()
  // jsdom lacks these browser APIs
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  window.scrollTo = vi.fn()
  window.confirm = vi.fn().mockReturnValue(true)
})
afterEach(cleanup)

describe('saved data', () => {
  it('keeps existing workout history when the app loads (old v2 data with retired presets)', () => {
    const y = yesterdayWorkout()
    const old = { ...defaultData(), presets: 2, history: [y] }
    mount(old)
    expect(savedData().history).toEqual([y])
  })
})

describe('navigation', () => {
  it('has 4 tabs; Settings opens from the profile button and goes back to Home', () => {
    mount()
    expect(tabbar().getAllByRole('button').map((b) => b.textContent)).toEqual(['Home', 'Routines', 'History', 'Progress'])
    fireEvent.click(screen.getByRole('button', { name: /Profile and settings/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeTruthy()
  })

  it('shows a backup dot on the profile button when a backup is due', () => {
    const d = defaultData()
    d.history = [yesterdayWorkout(), { ...yesterdayWorkout(), id: 'b', start: Date.now() - 2 * DAY }, { ...yesterdayWorkout(), id: 'c', start: Date.now() - 3 * DAY }]
    mount(d)
    expect(screen.getByRole('button', { name: 'Profile and settings, backup due' })).toBeTruthy()
  })

  it('settings sections open one at a time', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: /Profile and settings/ }))
    const workout = screen.getByRole('button', { name: 'Workout' })
    const look = screen.getByRole('button', { name: 'Appearance' })
    fireEvent.click(workout)
    expect(workout.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Default rest')).toBeTruthy()
    fireEvent.click(look)
    expect(workout.getAttribute('aria-expanded')).toBe('false')
    expect(look.getAttribute('aria-expanded')).toBe('true')
  })
})

describe('workout flow', () => {
  it('start, log a set, end and save: adds to history without touching earlier workouts', () => {
    const d = everyDay(defaultData())
    d.history = [yesterdayWorkout()]
    mount(d)
    fireEvent.click(screen.getByRole('button', { name: /Start workout/ }))
    expect(screen.getByRole('heading', { level: 2, name: 'Goblet squats' })).toBeTruthy()
    expect(screen.getByText('Set 1 of 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Done$/ }))
    // manual break mode: break waits to be started
    expect(screen.getByRole('button', { name: /Start break/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    fireEvent.click(screen.getByRole('button', { name: /Save & finish/ }))
    expect(screen.getByRole('heading', { name: 'Workout complete' })).toBeTruthy()
    const h = savedData().history
    expect(h).toHaveLength(2)
    expect(h[0].id).toBe('w-yesterday')
    expect(h[1].exercises[0].sets).toHaveLength(1)
  })

  it('bodyweight exercises show only the reps box', () => {
    const d = everyDay(defaultData())
    // Push-ups is the 2nd exercise of the default routine and has no weight
    mount(d)
    fireEvent.click(screen.getByRole('button', { name: /Start workout/ }))
    expect(screen.getByText(/^Weight/)).toBeTruthy()
    fireEvent.click(screen.getByText(/Exercise 1 of 8/))
    fireEvent.click(screen.getByRole('button', { name: 'Push-ups' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Push-ups' })).toBeTruthy()
    expect(screen.queryByText(/^Weight/)).toBeNull()
  })
})

describe('progress', () => {
  it('hides consistency until a full week has passed', () => {
    const d = defaultData()
    d.history = [{ ...yesterdayWorkout(), start: Date.now() - 60000, end: Date.now() }]
    mount(d)
    fireEvent.click(tabbar().getByRole('button', { name: 'Progress' }))
    expect(screen.queryByText('Consistency')).toBeNull()
    expect(screen.queryByText(/vs last month/)).toBeNull()
    expect(screen.getByText(/after your first full week/)).toBeTruthy()
  })

  it('shows consistency once there is a finished week', () => {
    const d = defaultData()
    d.history = [{ ...yesterdayWorkout(), start: Date.now() - 10 * DAY, end: Date.now() - 10 * DAY + 60000 }]
    mount(d)
    fireEvent.click(tabbar().getByRole('button', { name: 'Progress' }))
    expect(screen.getByText('Consistency')).toBeTruthy()
  })
})

describe('planned days', () => {
  const todayIdx = (new Date().getDay() + 6) % 7

  it('on a new day, Home picks the routine planned for today and lists it first', () => {
    const d = defaultData()
    d.activeRoutineId = 'seed-upper-body'
    d.autoPickDay = '2000-01-01'
    d.routines = d.routines.map((r) => (r.id === 'preset-full-body' ? { ...r, days: [todayIdx] } : r))
    mount(d)
    expect(screen.getByText('Planned for today')).toBeTruthy()
    expect(savedData().activeRoutineId).toBe('preset-full-body')
    const rows = screen.getAllByRole('radio')
    expect(rows[0].textContent).toContain('Full Body Express')
    expect(rows[0].textContent).toContain('Today')
  })

  it('does not auto-pick while a workout for another routine is running; the hero shows the running one', () => {
    const d = defaultData()
    d.activeRoutineId = 'seed-upper-body'
    d.autoPickDay = '2000-01-01'
    d.routines = d.routines.map((r) => (r.id === 'preset-full-body' ? { ...r, days: [todayIdx] } : r))
    localStorage.setItem('wt.session.v1', JSON.stringify({ routineId: 'preset-lower-core', start: Date.now(), idx: 0, logs: {}, rest: null, layout: 2 }))
    mount(d)
    fireEvent.click(screen.getByRole('button', { name: /Back to Home/ }))
    expect(savedData().activeRoutineId).toBe('seed-upper-body')
    expect(screen.getByText('In progress')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Lower Body & Core')
  })

  it('with nothing planned today, the hero says there is no session, with no start button or up next', () => {
    const d = defaultData()
    d.routines = d.routines.map((r) => (r.id === 'preset-full-body' ? { ...r, days: [(todayIdx + 1) % 7] } : r))
    mount(d)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('No session today')
    expect(screen.getByText('Rest day')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Start workout/ })).toBeNull()
    expect(screen.queryByText(/Up next/)).toBeNull()
  })

  it('Home no longer shows Ready to progress suggestions', () => {
    const d = defaultData()
    const y = yesterdayWorkout()
    y.exercises[0].sets = [{ reps: 12, weight: 4, duration: 0 }, { reps: 12, weight: 4, duration: 0 }]
    d.history = [y]
    mount(d)
    expect(screen.queryByText('Ready to progress')).toBeNull()
  })

  it('a manual pick after the auto-pick sticks for the day', () => {
    const d = defaultData()
    d.autoPickDay = '2000-01-01'
    d.routines = d.routines.map((r) => (r.id === 'preset-full-body' ? { ...r, days: [todayIdx] } : r))
    const { unmount } = mount(d)
    fireEvent.click(screen.getByRole('radio', { name: /Lower Body & Core/ }))
    unmount()
    mount()
    expect(savedData().activeRoutineId).toBe('preset-lower-core')
  })

  it('routine detail: active strip on top, manage actions at the bottom, no set counts or day hint', () => {
    mount()
    fireEvent.click(tabbar().getByRole('button', { name: 'Routines' }))
    expect(screen.queryByText(/sets?/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Open Lower Body/ }))
    expect(screen.queryByText(/Pick days/)).toBeNull()
    expect(screen.queryByText(/sets?/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Make active' })).toBeNull()
    expect(screen.getByText('Not active')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tuesday' }))
    fireEvent.click(screen.getByRole('button', { name: 'Saturday' }))
    expect(screen.getByText('Active routine')).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: /Duplicate routine/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Manage routine' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Duplicate routine/ }))
    expect(savedData().routines.map((r) => r.name)).toContain('Lower Body & Core (copy)')
    fireEvent.click(screen.getByRole('button', { name: 'Manage routine' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Delete routine/ }))
    expect(savedData().routines.map((r) => r.name)).not.toContain('Lower Body & Core (copy)')
  })

  it('every routine with a planned day is active, so several can be active at once', () => {
    const d = defaultData()
    d.routines = d.routines.map((r) => (r.id === 'seed-upper-body' ? { ...r, days: [0] } : r.id === 'preset-full-body' ? { ...r, days: [2, 4] } : r))
    mount(d)
    fireEvent.click(tabbar().getByRole('button', { name: 'Routines' }))
    const cards = screen.getAllByRole('button', { name: /^Open / })
    expect(cards.map((c) => c.textContent?.includes('Active'))).toEqual([true, true, false])
    expect(cards[2].getAttribute('aria-label')).toBe('Open Lower Body & Core')
  })

  it('days set in the routine editor are saved', () => {
    mount()
    fireEvent.click(tabbar().getByRole('button', { name: 'Routines' }))
    fireEvent.click(screen.getByRole('button', { name: /Open Lower Body/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Tuesday' }))
    fireEvent.click(screen.getByRole('button', { name: 'Thursday' }))
    expect(screen.getByRole('button', { name: 'Tuesday' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(/Tue, Thu\. Shows first/)).toBeTruthy()
    expect(savedData().routines.find((r) => r.id === 'preset-lower-core')!.days).toEqual([1, 3])
  })
})

describe('reminder time', () => {
  it('time picker is always visible, enabled once the reminder is on, and saves', async () => {
    Object.assign(window, { Notification: { permission: 'granted', requestPermission: vi.fn() } })
    mount()
    fireEvent.click(screen.getByRole('button', { name: /Profile and settings/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Goals & reminders' }))
    const time = screen.getByLabelText('Reminder time') as HTMLInputElement
    expect(time.disabled).toBe(true)
    fireEvent.click(screen.getByRole('switch', { name: 'Daily reminder' }))
    await screen.findByText('Notification shows at this time')
    expect(time.disabled).toBe(false)
    fireEvent.change(time, { target: { value: '07:30' } })
    expect(savedData().settings).toMatchObject({ reminderOn: true, reminderTime: '07:30' })
    delete (window as { Notification?: unknown }).Notification
  })
})
