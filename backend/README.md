# Methodica development API

Express + TypeScript. Provides a usable local study journey while the proposal's PostgreSQL/Prisma and account foundation is built.

## Run

```powershell
npm ci
npm run dev
```

Or compile and run a regular Node server:

```powershell
npm run build
npm start
```

Listens on `127.0.0.1:4000`, including when `NODE_ENV=production`. Vercel imports the exported app without opening a listener. Health checks: `/health` and `/api/health`. See [the API contract](../docs/API.md) for routes and validation.

Vercel imports `index.cjs`, which exports the compiled CommonJS handler in `dist/server.cjs`. The build type-checks with TypeScript and bundles internal modules with esbuild, leaving Node dependencies external. `npm test` builds first and smoke-tests the entry point in plain Node with `VERCEL=1`, including a collected CommonJS package scope. The public `/api/studytypes` and `/api/preview` routes do not require workspace storage; private workspace routes still return JSON 503 on Vercel. See [deployment verification](../docs/DEPLOYMENT.md).

## Configuration

| Variable     | Default                 | Meaning                                                                                                                           |
| ------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`       | `4000`                  | Local API port; update the Vite proxy if changed.                                                                                 |
| `DATA_FILE`  | `data/workspace.json`   | Workspace file relative to the backend working directory; prefer an absolute path for custom locations.                           |
| `WEB_ORIGIN` | `http://localhost:5173` | Allowed browser origin for direct cross-origin requests. Vite's same-origin proxy avoids this requirement for normal development. |

No `.env` loader is installed: set variables in your shell/environment. Example for an isolated demo:

```powershell
$env:DATA_FILE = 'C:\path\to\demo-workspace.json'
npm run dev
```

The file is created on the first write with starter flows and templates; history starts empty. Writes serialize in one process and use temporary-file replacement. A corrupt/unreadable file returns an error and is never silently replaced. Back it up before manual edits. `backend/data/` is ignored by Git.

## Limits

This adapter is local, unauthenticated, single-workspace, and single-process. It is not suitable for shared/public hosting, multiple API instances, or network-file storage. CORS is not authentication. Vercel workspace routes return 503 because its filesystem cannot provide the proposed durable database behavior. A health response is only a process check.

The production target from proposal v2 is PostgreSQL + Prisma, bcrypt/JWT accounts and authorization, and Socket.IO sync. Retain the two Spring Boot projects as independent assignment evidence. Do not build competing production APIs. See [the project checklist](../PROJECT_TODO.md) for owners and acceptance tests.

## Check

```powershell
npm run lint
npm test
npm run build
```

The HTTP integration test starts an ephemeral loopback server against a temporary file. It covers the complete local persistence journey, validation, missing routes, exact retry/conflicting session IDs, import deduplication, parallel writes, restart durability, and corrupt-file preservation.
