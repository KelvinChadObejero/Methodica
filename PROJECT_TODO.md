# Methodica project checklist

Updated 2026-10-28. For Kelvin and Andrei. This is the working backlog; update it in the same PR as the work. The [original review roadmap](docs/REVIEW_ROADMAP.md) is retained as a reference, not a second status tracker.

The proposal v2 specifies React + TypeScript on web, React Native + Expo on mobile, and Node.js + Express + TypeScript with PostgreSQL and Prisma. Sections 7.2–7.3 and 13.2 establish the backend direction, with a caveat for instructor requirements. Keep the two Spring Boot projects as separate classroom assignments. Do not connect the website to two production APIs.

## How we use this

Use **To do → In progress → In review → Done**, with **Blocked** only for a named dependency. One owner implements; the other reviews. Pick two or three tasks each week and finish them before expanding the sprint. Keep one feature branch per task or coherent group. Add the task ID, test evidence, and a short demo path to each PR. A checked local implementation below still needs partner review and merge.

Established ownership: Andrei leads M1 accounts, M2 builder, and M3 StudyTypes. Kelvin leads S1 sync, S2 community, and S3 reflection. M4 timer, M5 history, and S4 dashboard were unassigned in the proposal; the lead suggestions below need a joint sprint-planning decision.

## Current implementation awaiting review

All of these run locally on the Express development API. None imply that accounts, production PostgreSQL, or cross-device sync have shipped.

- [x] **FIX-01 · Both review:** fix timer lint failures, the stray CSS media-query brace, and settings duration bounds.
- [x] **M2-LOCAL · Andrei reviews:** create/edit/delete named flows; add/remove/reorder blocks with keyboard-accessible buttons; validate durations and derive totals on the API.
- [x] **M3-LOCAL · Andrei reviews:** browse the initial technique toolkit. Complete the proposal's research catalog in M3-02 below.
- [x] **M4-LOCAL · Both review:** run saved flows; pause/resume; measure elapsed time by deadline; recover the active run after refresh; exclude breaks and skipped time from study totals.
- [x] **M5-LOCAL · Both review:** save actual sessions; retry saves with the same session ID; show history with subject/search/reflection filters.
- [x] **S3-LOCAL · Kelvin reviews:** choose an actual session, save/update its comprehension, fatigue, and notes, and reopen the reflection in history.
- [x] **S4-LOCAL · Both review:** derive analytics and date-range reports from saved sessions, with empty states and no fabricated progress score.
- [x] **S2-LOCAL · Kelvin reviews:** import starter templates into the saved library; publish/update a flow snapshot in the local collection. No fabricated users or ratings.
- [x] **FIX-02 · Kelvin reviews:** restore saved theme on startup; make JSON/CSV exports respect the format and contain only Methodica data; reset browser preferences without deleting unrelated site storage.
- [x] **QA-01 · Both review:** test timer timing/pause/skip/refresh, range analytics and CSV; integration-test API validation, parallel writes, restart persistence, corrupt-file preservation, and duplicate-save behavior; run tests in CI.
- [x] **DEPLOY-FIX-01 · Both review:** use a compiled JavaScript Vercel entry point and smoke-test it in native Node; serve the public catalog without database storage; replace blank hosted pages with recovery and explicit browser-only workspace access. Device mode does not fulfill account/database/sync requirements.
- [ ] **DEPLOY-QA-01 · Both:** verify the exact Vercel preview and production API/pages after each deployment, using [the deployment checklist](docs/DEPLOYMENT.md). Confirm database provisioning and environment configuration with team access before starting DB-02 hosting integration.

## Next milestone: private student workspace

Finish the foundation before deploying the local adapter for real users. The current API deliberately binds to localhost, stores one workspace in `backend/data/workspace.json`, and refuses workspace requests on Vercel. It has no account isolation. API storage and hosting must change together.

| ID         | Priority | Suggested owner / reviewer | Status | Depends on    | Acceptance criteria                                                                                                                                                                                                   |
| ---------- | -------- | -------------------------- | ------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB-01      | P0       | Both                       | To do  | —             | Finalize the six-entity PostgreSQL schema: User, StudyFlow, ordered StudyBlock, StudyType, StudySession, SessionLog. Record ownership, template metadata, session snapshots, and deletion rules.                      |
| DB-02      | P0       | Andrei / Kelvin            | To do  | DB-01         | Add Prisma schema, repeatable migrations and seed. Fresh database setup works from the README. Restart and transaction tests use PostgreSQL. Replace the file adapter; do not silently fall back to it in production. |
| M1-01      | P0       | Andrei / Kelvin            | To do  | DB-02         | Register, sign in/out, recover access; bcrypt password hashes; short-lived JWTs and refresh-token rotation/revocation. Registration cannot grant privileged roles.                                                    |
| M1-02      | P0       | Andrei / Kelvin            | To do  | M1-01         | Every private flow/session/reflection query enforces owner access. Two-user tests prove another user's IDs cannot be read, changed, exported or deleted. Mentor access follows an explicit permission rule.           |
| WEB-01     | P0       | Kelvin / Andrei            | To do  | M1-01         | Account screens, protected routes, expired-session recovery, useful loading/error states. Draft study work survives a recoverable request failure.                                                                    |
| DB-03      | P0       | Both                       | To do  | DB-02         | Decide how to import existing local workspace exports and legacy `methodica-sessions` browser records without overwriting, duplicating or attributing them to the wrong account. Test malformed imports.              |
| RELEASE-01 | P0       | Both                       | To do  | M1-02, WEB-01 | New student signs in, builds a two-block flow, completes it, saves a reflection, signs out/in, and finds the same session/reflection. Repeat with a second account and device.                                        |

Do not mark RELEASE-01 done based only on a screen looking complete. It requires the whole journey, persisted database records, and ownership tests.

## Finish the proposed MVP

| ID    | Priority | Suggested owner / reviewer | Status | Depends on   | Acceptance criteria                                                                                                                                                                                                                                       |
| ----- | -------- | -------------------------- | ------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2-02 | P1       | Andrei / Kelvin            | To do  | DB-02        | Add the proposal's visual drag-and-drop builder while retaining keyboard reordering. Reopen the exact ordered blocks after signing in on another device. Warn before losing an unsaved draft on navigation.                                               |
| M3-02 | P1       | Andrei / Kelvin            | To do  | DB-02        | Complete Active Recall, Spaced Repetition, Interleaving, Feynman/self-explanation and other agreed techniques with source references, plain-language explanations, suggested durations, and quick-load blocks/templates. Persist StudyType relationships. |
| M4-02 | P1       | Kelvin (proposed) / Andrei | To do  | DB-02        | Store block-level execution, completion and skip events. Verify background throttling, refresh, clock changes, interrupted network saves, tab closure, and duplicate tabs. Confirm transition alerts on real browsers.                                    |
| M5-02 | P1       | Kelvin (proposed) / Andrei | To do  | DB-02, M1-02 | Add pagination and server-side filtering. Sessions keep historical titles/block snapshots when the source flow changes or is deleted. Legacy data migration is tested.                                                                                    |
| S3-02 | P1       | Kelvin / Andrei            | To do  | M1-02        | Reflections are private, one per session, update safely and survive re-login. Failed saves retain the user's notes.                                                                                                                                       |
| S4-02 | P1       | Kelvin (proposed) / Andrei | To do  | M5-02        | Aggregate analytics in the API for large histories; agree on timezone, active-day/streak rules and partial-session treatment. Charts and exports agree for the same date range.                                                                           |

## Enhancements after the core journey

| ID          | Priority          | Suggested owner / reviewer | Status | Depends on       | Acceptance criteria                                                                                                                                                                                                            |
| ----------- | ----------------- | -------------------------- | ------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S2-02       | P1                | Kelvin / Andrei            | To do  | M1-02, M2-02     | Public browse/publish/import, one rating per user, author ownership, reporting and moderation. Imported flows remain independent copies. Publishing is explicit and private notes never leak.                                  |
| S1-01       | P1                | Kelvin / Andrei            | To do  | DB-02, M1-02     | Shared database/account on web and mobile; Socket.IO change events after successful commits; reconnect refresh and conflict tests. Document the proposal's v1 last-write-wins rule and show conflicts clearly.                 |
| MOBILE-01   | P1                | Both assign                | To do  | RELEASE-01       | Add React Native + Expo client, reuse types and design tokens, run flows and reflections on a physical device. If mobile scope changes, record the decision in the proposal.                                                   |
| SETTINGS-01 | P2                | Kelvin / Andrei            | To do  | M1-02, MOBILE-01 | Account preferences sync; browser/mobile notification permissions match actual delivery. Add scheduled reminders and weekly reports only with a working scheduler and opt-out.                                                 |
| DATA-01     | P1                | Both                       | To do  | M1-02            | Account-only JSON/CSV export, explicit account/data deletion policy, tested retention and recovery. Never clear all storage for an unrelated app on the same origin.                                                           |
| QA-02       | P1                | Both                       | To do  | RELEASE-01       | Automated browser journey plus manual mobile, keyboard, screen-reader and contrast review; no horizontal page overflow at 375px. Three classmates can build/start two blocks without help; record issues and fixes.            |
| OPS-01      | P0 before release | Both                       | To do  | DB-02, M1-02     | Staging/production configuration, HTTPS, CORS allowlist, secret handling, rate limits, database backups with a restore test, error logging. Restrict classroom CRUD UI in real-user release. Document API/deployment rollback. |

## Later

- [ ] **N1 · Unassigned:** adaptive recommendations after enough real completion/fatigue data exists to evaluate them.
- [ ] **N2 · Unassigned:** gamification and credentials after the core journey is reliable.
- [ ] **N3 · Unassigned:** external calendar integration after privacy and synchronization rules are established.

## Definition of done

- [ ] Acceptance criteria demonstrated using saved data, including refresh/restart where applicable.
- [ ] `npm run lint`, `npm test`, and `npm run build` pass in the affected package; CI is green.
- [ ] Loading, empty, validation and API-failure states are usable; success is shown only after a successful save.
- [ ] Keyboard/mobile checks completed for changed screens; cross-account tests completed for private endpoints.
- [ ] Other teammate reviewed; docs/API contracts updated; PR merged. Add its link beside the task.
