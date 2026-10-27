# Methodica frontend

React 18 + TypeScript with Vite. Uses the Focused Indigo design system in `../DESIGN.md`.

## Run

```powershell
npm ci
npm run dev
```

Start the API in a second terminal (`cd backend; npm run dev` from the repo root). Open http://localhost:5173. `/api` is proxied to `127.0.0.1:4000`; a missing API produces a connection error and retry, not a simulated save.

## Structure

- `src/App.tsx`: hash-route navigation with browser back/forward and direct links such as `/#builder` or `/#history`.
- `src/lib/workspace.tsx`: API-backed workspace provider. Components update from successful API responses.
- `src/lib/useWorkspace.ts`: shared context/hook.
- `src/lib/timer.ts`: pure deadline timer; tested without waiting for real minutes.
- `src/lib/analytics.ts`: local-calendar date ranges, streaks and subject totals from sessions.
- `src/lib/preferences.ts`: validated browser settings and theme application before first render.
- `src/lib/export.ts`: workspace download and escaped session/reflection CSV.
- `src/types.ts`: screen/settings types and type-only re-exports of the API contract in `backend/src/domain.ts`.
- `src/screens/`: dashboard, flow builder, technique toolkit, timer, history, reflection, local templates, connection status, settings and separate classroom demo.

The timer remains mounted while navigating between screens. Active runs use session storage in the same tab for refresh recovery, with separate keys for API and device modes. Ended sessions and reflections live in the selected workspace. If the online workspace is unavailable, an explicit **Use this device** action creates/reopens a browser-only workspace. Its saves and exports never call private API mutation routes, and switching to the API does not upload/merge browser data. Corrupt or full browser storage fails visibly. Multiple tabs do not coordinate active timers yet. Unsaved builder/reflection form drafts are not retained when leaving the screen.

Notifications are limited to block transitions while a tab is open and browser permission is granted. Scheduled reminders, weekly reports, public ratings, account sync, and the proposal's complete research catalog are backlog work. Existing legacy `methodica-sessions` browser records are not automatically imported; do not clear them before an agreed migration.

## Check

```powershell
npm run lint
npm test
npm run build
```

For a production build connected to the API, run `npm run build`, then `npm run preview`. Preview proxies `/api` using the same local API target. A real deployment needs the PostgreSQL/account work in `../PROJECT_TODO.md`.
