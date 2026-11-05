# Workout Tracker

A mobile-first workout tracker that works offline and installs on your phone as a Progressive Web App (PWA). It uses React, Vite and TypeScript, with plain CSS. All data stays on your device in `localStorage`. There is no backend and no account.

On first launch it loads five routines built for two 4 kg dumbbells plus bodyweight: **Upper Body & Posture** (the default), **Lower Body & Core**, **Push Day**, **Pull Day** and **Full Body Express**. You can edit every part of them in the app, and each one can be reset to its default.

## Features

- **Guided workout.** Shows the current exercise, set X of Y and the target. Reps and weight are pre-filled and can be adjusted. Tap Done to log the set.
- **Timed exercises** (like the plank). Get-ready countdown, then start / pause / reset, with a sound and vibration at the end.
- **Automatic rest timer** with +15s and Skip. Back, Skip, previous/next exercise, a progress bar, and a list where you tap any exercise to jump to it.
- **Accurate timers.** They are based on timestamps, so time stays correct when the tab is in the background or the screen is locked.
- **Screen stays awake** during a workout (Wake Lock API).
- **Finish summary.** Total time, sets done and new personal records.
- **Routine editor.** Add, delete, rename and reorder exercises. Per exercise: sets, rep range, weight, rest, notes, and reps or timed. Supports multiple routines, duplicating a routine and resetting the default one.
- **Form guides.** Each exercise shows an animated silhouette of the movement, drawn as inline SVG so it works offline. The figure is picked from the exercise name, and you can override it in the editor. You can also add your own photo to any exercise; it's compressed to a small JPEG and stored on the device. Turn guides off in Settings. Open the app with `#figures` at the end of the URL to see every illustration on one page.
- **Optional warm-up and cool-down** stretches with timers, turned on in Settings.
- **History** with a calendar. **Progress** charts and personal records for each exercise.
- **Weekly goal and week streak.**
- **Progression suggestions.** When you hit the top of the rep range on every set, the app offers to add weight or reps (or 5 s for timed exercises).
- **Settings.** Sound, vibration, default rest, get-ready time, kg/lb, theme (system/dark/light), daily reminder, and JSON export/import for backups.

## Run locally

Requires Node 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
```

## Use it on your phone

**Quick test on the same Wi-Fi.** `npm run dev` also listens on your network. Open the `Network:` URL it prints (e.g. `http://192.168.1.20:5173`) on your phone. This works for trying the app out. Browsers only install a PWA and run its service worker over **HTTPS**, though, so over plain LAN HTTP you can't install it and it won't work offline.

**Install it as an app.** Deploy it (below), open the HTTPS URL on your phone, and then:

- **Android (Chrome):** menu ⋮, then **Install app** (or **Add to Home screen**)
- **iPhone (Safari):** Share, then **Add to Home Screen**

After that it opens full-screen from your home screen and works offline.

## Build

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ at http://localhost:4173 (also on LAN)
```

## Deploy

The build uses relative paths (`base: './'`), so it works at a domain root or in a subfolder.

### GitHub Pages

1. Push this folder to a GitHub repo, with `main` as the default branch.
2. In the repo, go to **Settings → Pages → Source** and choose **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` tests, builds and deploys.
4. Open `https://<user>.github.io/<repo>/` on your phone and install it.

### Netlify

- **Drag and drop:** run `npm run build`, then drop the `dist/` folder onto https://app.netlify.com/drop.
- **From Git:** connect the repo. `netlify.toml` already sets the build command and the publish folder.

## Notes and limitations

- **Data lives in this browser.** Clearing site data deletes it, so use **Settings → Export JSON** for backups. Installing the app on a phone gives it separate storage from the phone's browser tab.
- **Daily reminder.** Without a push server, browsers can't schedule notifications. The reminder fires once a day, after the time you set, while the app is open or in the background, and only if you haven't trained that day.
- **Vibration** works on Android only. iOS Safari doesn't support it.
- **Wake Lock** needs HTTPS and a recent browser (Chrome/Edge, or Safari 16.4+).

## Project layout

```
src/
  types.ts        data model (routines are plain data)
  seed.ts         default routine + settings
  logic.ts        pure logic: steps, PRs, progression, streaks (unit-tested)
  store.tsx       React context + localStorage persistence + import validation
  hooks.ts        timestamp countdown, tick, wake lock
  figures/        skeleton rig (forward kinematics) + exercise animations
  reminders.ts    daily notification check
  screens/        Home, WorkoutScreen, Routines, History, Progress, SettingsScreen
  components/     NumInput/Stepper, Calendar, LineChart
```
