# Methodica

A modular study-flow website built with React + TypeScript and an Express + TypeScript API. Build a sequence of study blocks, run it, save a reflection, and review your actual progress.

## Run locally

Use Node.js 24 to match CI. Open two terminals from the repository root.

Frontend:

```powershell
cd frontend
npm ci
npm run dev
```

API:

```powershell
cd backend
npm ci
npm run dev:local
```

Open http://localhost:5173. Vite proxies `/api` to `127.0.0.1:4000`; both processes must be running. The frontend uses port 5173 strictly so an unexpected second instance does not silently use another port.

## What works in this development version

- Accounts: email/password registration, login/logout, restored sessions and private PostgreSQL workspaces.
- Flow library: create, rename, edit, delete, add/remove/reorder blocks, calculate duration.
- Technique toolkit and starter templates; import a template into the library and publish a saved flow to the local collection.
- Timer using saved flows, pause/resume, skip, actual elapsed study time, and recovery after refresh in the same tab.
- Sessions and editable reflections saved in the selected workspace; searchable/filterable history.
- Dashboard summaries, subject breakdown, streaks and reports based on saved sessions.
- Persistent browser theme and defaults; browser notifications for block transitions when permission is granted; Methodica-only JSON/CSV export.

An empty workspace shows no sample history or invented statistics. Sync, public ratings, scheduled reminders, and weekly reports are identified as planned.

On the hosted website, create an account or log in to save a private workspace. Registration starts fresh; device records are not automatically uploaded. **Use this device** remains available for browser-only study. Export a backup before clearing site data. The technique catalog works without login.

## Account and deployment foundation

PostgreSQL and Prisma now persist accounts and owner-scoped workspace documents. Better Auth manages password hashes and revocable session cookies. [AUTH.md](docs/AUTH.md) explains this session/hash choice relative to the proposal. Email recovery, verification, mentor roles, normalized study tables and automatic live synchronization remain on the checklist.

Vercel applies migrations, then builds a small CommonJS bridge and self-contained ESM server bundle. Native Node checks exercise the collected package scope and authenticated database requests. See [DEPLOYMENT.md](docs/DEPLOYMENT.md) and [backend setup](backend/README.md).

The Spring Boot projects remain independent classroom exercises with separate local H2 databases. See [CLASSROOM-DEMO.md](CLASSROOM-DEMO.md); they are not the website's production API.

## Collaboration

- **Andrei Mesiah M. Canoy:** M1 accounts/roles, M2 Flow Builder, M3 StudyTypes.
- **Kelvin Chad L. Obejero:** S1 synchronization, S2 community, S3 reflections and shared design system.
- **Both:** data model, API contract, review and integration. Leads for M4 timer, M5 history and S4 analytics are proposed in the checklist and should be assigned during sprint planning.

Use [PROJECT_TODO.md](PROJECT_TODO.md) as the shared working list: priorities, owners/reviewers, dependencies, acceptance criteria, and what is implemented locally versus still needed for release. The earlier [review roadmap](docs/REVIEW_ROADMAP.md) remains as a reference. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for branches and partner review; read [DESIGN.md](DESIGN.md) before changing screens.

## Checks

Run inside each of `frontend/` and `backend/`:

```powershell
npm run lint
npm test
npm run build
```

GitHub Actions runs those checks for both packages. API tests use a temporary file for the legacy adapter and a disposable PostgreSQL database for accounts. It never changes your development workspace. Frontend tests cover deadline timing, pause/skip/reset behavior, analytics and CSV exports.

## Structure

```text
frontend/             React website, styles, shared UI logic and timer tests
backend/              Express API, accounts, Prisma migrations and integration tests
spring-backend/       Separate classroom Study Flow CRUD assignment
spring-user-backend/  Separate classroom User CRUD assignment
docs/API.md           API routes, data semantics and storage limits
PROJECT_TODO.md       Two-person project backlog
DESIGN.md             Focused Indigo design tokens
```

See [frontend/README.md](frontend/README.md), [backend/README.md](backend/README.md), and the [API contract](docs/API.md) for implementation details.
