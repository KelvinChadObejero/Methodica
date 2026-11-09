# Class demo — November 10, 2026

## Run and verify

Use Node 24. In `backend`, run `npm ci` and `npm run dev:local`. In a second
terminal, run `npm ci` and `npm run dev` in `frontend`. Open
http://localhost:5173. This uses a persistent database on this machine and never
uses the hosted production database.

For the automated browser journey, first install dependencies in both packages,
then run `npm run db:generate` in `backend`. In `frontend`, run
`npx playwright install chromium` once, then `npm run test:e2e`. It provisions a
disposable database/API on port 4100 and a separate Vite instance on port 5174.
The browser suite uses full Chromium in headless mode so permitted desktop
Notification construction is exercised. Those ports must be free; the runner refuses to reuse existing servers.
The main journey waits for two real one-minute blocks so API elapsed-time
validation is exercised. Screenshots and failure traces are in
`frontend/test-results`. CI uploads them as `browser-evidence`.

## Demonstrate the student journey

1. Create a test account. Show the account label and empty session history.
2. Open StudyTypes, search for Feynman, expand its research references, and use
   the technique in a new flow. Suggested durations are editable defaults.
3. Name the flow and subject; add another study block. Drag block numbers to
   reorder them, then demonstrate Move up/Move down using the keyboard.
4. Save. Reload or log in from another browser and reopen the exact block order.
5. Run a two-block flow. Pause/resume and refresh once, then explicitly Resume the recovered timer. Complete it or use
   Finish & save elapsed time to demonstrate a partial session honestly.
   Duplicate the tab to show its control lock. Open the saved session's execution timeline after completing or skipping a block.
6. Save a reflection. Reopen it in history, update it, log out/in, and verify it.
7. Open a second account. Show that its flows/history/reflections are separate.
8. If useful, demonstrate the existing explicit device-data review/import and
   retry without duplicate sessions. Device work stays separate until confirmed.

## Recovery and boundaries

Unsaved builder/reflection changes are copied to account/session-scoped
`sessionStorage` and restored in the same tab. Navigation warns before leaving
an unsaved form; a failed save retains input. A recovery copy is not a database
save, does not sync to another device, and disappears when that tab is closed.
Blocked storage produces a warning. Another account does not load the draft.

Email verification/password reset, mentor permissions, public community posts,
live sync and mobile remain follow-up work. Hosted verification and partner
review must be completed separately before calling this a production release.

For QA-02 in class, ask three classmates to create and start a two-block flow
without help. Record where they hesitate, keyboard/mobile issues and fixes.
Screen-reader and contrast review remain open; screenshots do not replace them.
