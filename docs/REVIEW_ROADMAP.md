# Methodica Website Review and Development Roadmap

This roadmap captures the current state of Methodica and the work needed to move from a classroom prototype to a website ready for real users. It is based on a review of the project source, the earlier frontend build, and the Spring Boot assignment tests. A live visual inspection was not completed, so the interface and accessibility still need hands-on review.

The recommended first milestone is a complete, trustworthy student journey: a student creates an account, builds a study flow, runs it, saves a reflection, and finds the real session and reflection afterward. Finish this journey before expanding into advanced features.

## Current state

| Area | Current state |
| --- | --- |
| Study Flow and User CRUD | Working Spring Boot classroom demos on individual workstations. They use separate local databases and are not integrated into a production backend. |
| Flow Builder and StudyTypes | Listed in navigation but currently unavailable. |
| Timer | Has preset flows and saves session records in the browser, but those records are not connected to the displayed session-history screen. |
| Dashboard and history | Display hard-coded sample information. |
| Reflection | Shows a sample session and reports success, but the submission is logged to the browser console rather than saved. |
| Sync and Community Hub | Interfaces are present, but sync is simulated; community templates are samples, and importing does not create a real saved flow. |
| Deployed API | The existing Express backend is a placeholder with a health check, not the full Methodica API. |

The immediate concern is trust. For example, the reflection screen says an entry was saved to session history when it was not, and the sync screen displays a successful sync without actually syncing. Until these features are connected, users should be able to tell which information and actions are demonstrations.

## Priority 1: Make the current preview honest

These changes are useful even before the real backend is ready.

- [ ] Label sample dashboard statistics, session history, and community templates as **sample data**, or hide them when there is no real data.
- [ ] Replace simulated “saved,” “imported,” and “up to date” messages with clear **coming soon** states until those actions work.
- [ ] Keep the classroom CRUD demo clearly marked as a demo, and remove or restrict it in the eventual real-user release.
- [ ] Fix the settings number inputs: the current bounds calculation can force entered values to the maximum.
- [ ] Fix the existing frontend lint errors in `Timer.tsx`, then make repository checks pass consistently.

## Priority 2: Agree on the real backend and data model

The proposal describes Express and PostgreSQL, while the individual assignments use Spring Boot. The team should choose the final backend together, taking any course requirements into account.

- [ ] Decide whether the final backend will use **Spring Boot** or **Express**. Avoid maintaining separate production APIs without a clear reason.
- [ ] Agree on a database and finalize the ERD: User, StudyFlow, StudyBlock, StudyType, StudySession, and SessionLog.
- [ ] Define relationships, ownership, deletion behavior, and how study blocks are ordered.
- [ ] Agree on API request and response formats before connecting the screens.
- [ ] Set up a shared development database and database migrations. Keep the existing local CRUD exercises available as assignment evidence.
- [ ] Update the README and proposal to describe the stack the team actually chooses.

## Priority 3: Build the minimum complete student journey

Complete these in sequence so that each step supports the next.

### Accounts and privacy

- [ ] Add registration, sign-in, sign-out, and a way to recover access.
- [ ] Ensure students can access only their own private flows, sessions, and reflections.
- [ ] Keep roles controlled by the backend; users must not be able to grant themselves administrator privileges.

### StudyType library

- [ ] Add the research-backed techniques from the proposal, with descriptions and suggested durations.
- [ ] Let users browse and select StudyTypes while creating a flow.

### Study Flow Builder

- [ ] Create, rename, edit, and delete a flow.
- [ ] Add, remove, reorder, and customize blocks; calculate the total duration.
- [ ] Save a flow to the shared database and reopen it after signing in again.

### Run and record a session

- [ ] Connect the existing timer to saved flows rather than presets alone.
- [ ] Track actual start, pause, completion, and skipped-block behavior.
- [ ] Check timer accuracy when the browser tab is inactive or the page is refreshed.

### Reflection and history

- [ ] Show the actual completed session in the reflection screen.
- [ ] Save the reflection against that session.
- [ ] Show the saved session and reflection in history after refresh and on another device.

**Acceptance test:** A new student can sign in, build a two-block flow, run it, save a reflection, and find it again after signing out and back in.

## Priority 4: Connect the enhancement screens

Once the core journey is reliable:

- [ ] **Dashboard:** Calculate streaks, study time, and trends from real sessions; provide useful empty states for new users.
- [ ] **Community Hub:** Implement publish, browse, import, and rating. Define who can publish and add a way to report inappropriate content.
- [ ] **Cross-device sync:** Use the shared account and database first; add real-time updates only if needed. Define what happens when two devices edit the same flow.
- [ ] **Settings:** Connect each setting to real behavior. Notification preferences should reflect actual browser permission and delivery.
- [ ] **Export and deletion:** Export only Methodica data in the selected format, and make account and data deletion behavior clear and testable.
- [ ] **Mobile:** Decide whether the first release needs a separate React Native app or a well-tested mobile web experience. The proposal includes both, so record any scope change.

## Priority 5: Prepare for real users

- [ ] Review mobile layouts, keyboard navigation, readable contrast, form labels, and error messages.
- [ ] Add tests for the core journey, authorization, validation, failed requests, and database persistence.
- [ ] Expand continuous integration to test the chosen backend, including the Spring projects if they become the production stack. The current workflow checks the frontend and the Express scaffold.
- [ ] Set up separate development and production environments, protected secrets, backups, error logging, and a recovery plan.
- [ ] Review privacy: what data is collected, who can see it, how long it is retained, and how users can delete it.
- [ ] Test with a few classmates using a simple task: “Create and complete a two-block study flow without help.” Use their feedback before adding stretch features.

## Suggested division of work

Based on the responsibilities in the proposal:

- **Andrei:** Lead accounts, the StudyType library, and the Flow Builder.
- **Kelvin:** Lead session history, reflection, dashboard integration, and later community and sync.
- **Both:** Agree on the database, API contract, backend stack, and security rules before implementing against them. Review each other's changes and test the complete student journey together.

Leave adaptive recommendations, gamification, and external calendar integration until the complete student journey works reliably. Those features will be easier to evaluate once Methodica has real flows and session data.
