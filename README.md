# SnackMove (PWA)

Mobile-first progressive web app for short movement “snacks” (1–3 minutes) to break up sitting. Built to the SnackMove MVP PRD: low friction, high compliance, no equipment, habit-first.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** for UI (card-based, purple/pink/yellow/blue accents)
- **Zustand** for app state
- **Dexie.js** (IndexedDB) for persistence
- **Vite PWA** (Workbox) for service worker, manifest, offline

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` (use a mobile viewport or device for best experience).

## Build & deploy

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host. The app is installable (Add to Home Screen) and works offline.

## Features (MVP)

- **Onboarding**: Time window (9–5 default), active days (Mon–Fri), snack style (Gentle / Energizing / Strength).
- **Home**: Status (within/outside window), “Next snack in ~X min”, Log Snack, today’s progress (goal 3), benefits copy, streak.
- **Reminders**: In-app timer + local notifications when due; snooze (5/10/15/30 min, max 3, not past window end).
- **Stats**: Total snacks/minutes, current streak, 7-day average, calendar heatmap (tap day for details).
- **Settings**: Time window, active days, snack style, max reminders, min spacing, duration 1–5 min, notifications toggle, reset data.
- **Data**: All in IndexedDB (no account). UserSettings + SnackEvent; daily success = ≥3 snacks.

## PWA

- Service worker: precache + runtime cache (e.g. fonts).
- Manifest: name, short_name, theme/background, standalone, icons (SVG).
- Notifications: requested after onboarding; reminders fire when app is open (and show a notification); click opens app.

No backend or push server in MVP; reminders run only while the app/tab is used. For true push when the app is closed you’d add a push service later.
