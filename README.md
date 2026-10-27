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
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to `127.0.0.1:4000`; both processes must be running. The frontend uses port 5173 strictly so an unexpected second instance does not silently use another port.

## What works in this development version

- Flow library: create, rename, edit, delete, add/remove/reorder blocks, calculate duration.
- Technique toolkit and starter templates; import a template into the library and publish a saved flow to the local collection.
- Timer using saved flows, pause/resume, skip, actual elapsed study time, and recovery after refresh in the same tab.
- Sessions and editable reflections saved in the selected workspace; searchable/filterable history.
- Dashboard summaries, subject breakdown, streaks and reports based on saved sessions.
- Persistent browser theme and defaults; browser notifications for block transitions when permission is granted; Methodica-only JSON/CSV export.

An empty workspace shows no sample history or invented statistics. Sync, public ratings, scheduled reminders, and weekly reports are identified as planned.

On the hosted website, choose **Use this device** while online storage is unavailable. Flows, sessions, reflections, and template copies then persist in this browser only, with an explicit device-storage label. Device data is never automatically uploaded, shared publicly, or merged with the API workspace. JSON/CSV export works in both modes; back up device data before clearing site storage. The public technique catalog works without a database.

## Development scope and production direction

This API currently stores **one local workspace** in `backend/data/workspace.json`, created on the first write. It is a development adapter, has no user authentication, and is bound to localhost. Do not use it as a public multi-user backend or run multiple writers against its file. `DATA_FILE` can select a separate file for tests or demos.

The v2 proposal specifies **Node.js + Express + TypeScript, PostgreSQL, Prisma, JWT/bcrypt, and Socket.IO**. PostgreSQL migrations, accounts, ownership checks and deployed cross-device persistence are the next foundation tasks. Private workspace endpoints deliberately return 503 on Vercel until persistent database storage is implemented. Public health, technique catalog, and empty starter-preview endpoints remain available. Device mode is a usable preview, not a substitute for this production architecture.

Vercel's backend entry point is `backend/index.cjs`, which exports a compiled CommonJS bundle from `dist/server.cjs`. Native Node smoke tests exercise this exact entry point and a collected CommonJS package scope; lint/build success alone does not verify a deployed function can start. See [DEPLOYMENT.md](docs/DEPLOYMENT.md).

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

GitHub Actions runs those checks for both packages. The API integration test uses its own temporary data file, including a restart persistence check. It never changes your development workspace. Frontend tests cover deadline timing, pause/skip/reset behavior, analytics and CSV exports.

## Structure

```text
frontend/             React website, styles, shared UI logic and timer tests
backend/              Express API, local storage adapter and HTTP integration test
spring-backend/       Separate classroom Study Flow CRUD assignment
spring-user-backend/  Separate classroom User CRUD assignment
docs/API.md           API routes, data semantics and storage limits
PROJECT_TODO.md       Two-person project backlog
DESIGN.md             Focused Indigo design tokens
```

See [frontend/README.md](frontend/README.md), [backend/README.md](backend/README.md), and the [API contract](docs/API.md) for implementation details.
