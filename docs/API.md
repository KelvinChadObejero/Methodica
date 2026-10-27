# Development API contract

The existing website uses one Express + TypeScript API. This iteration provides a **local single-workspace adapter**, not the proposal's production account/database implementation. Shared request/result types live in `backend/src/domain.ts` and are imported as types by the frontend. The frontend requests `/api/...`; Vite proxies that prefix to `127.0.0.1:4000`.

## Endpoints

| Method | Path                        | Behavior                                                                                                                                                   |
| ------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`, `/api/health`    | Service status and storage adapter. Health does not prove the data file is readable.                                                                       |
| GET    | `/api/workspace`            | `{version, flows, sessions, templates}` snapshot. New workspace has starter flows/templates and no sample session history.                                 |
| GET    | `/api/studytypes`           | Initial technique descriptions and suggested durations.                                                                                                    |
| GET    | `/api/flows`                | Saved flow library.                                                                                                                                        |
| POST   | `/api/flows`                | Create from `{title, tag, blocks}`; server generates IDs and calculates `totalMinutes`. Returns 201.                                                       |
| PUT    | `/api/flows/:id`            | Replace title, subject and ordered blocks. Existing session snapshots remain unchanged.                                                                    |
| DELETE | `/api/flows/:id`            | Remove flow; preserve history and published copies. Returns 204.                                                                                           |
| GET    | `/api/sessions`             | Saved sessions, including optional reflection. Client sorts by start timestamp.                                                                            |
| POST   | `/api/sessions`             | Save an ended run with a client-generated stable ID. Exact retries return 200 and the existing record; new runs return 201; conflicting reuse returns 409. |
| PUT    | `/api/sessions/:id/log`     | Save/update `{comprehension, fatigue, notes}`; server derives session labels and sets `hasReflection`.                                                     |
| POST   | `/api/templates/:id/import` | Copy blocks into a saved flow. Repeated import returns the existing imported flow. Deleting that copy permits re-import.                                   |
| POST   | `/api/flows/:id/publish`    | `{author}` creates/updates a template snapshot in this local collection. No public identity or rating is implied.                                          |

All errors are JSON `{message}`. Validation errors return 400; missing records 404; duplicate conflicts/library limits 409; oversized bodies 413; storage errors 500. On Vercel, workspace routes return 503 until a durable production database adapter exists. Failed storage reads never reset the file to seed data. Responses are not cached.

## Flow validation

Titles are trimmed, nonempty, at most 120 characters; subjects at most 60. A flow has 1–20 blocks, each with a title, one of `focus | break | review | recall`, and an integer duration of 1–120 minutes. Total duration cannot exceed 480 minutes. At least one block must be a study block. IDs and totals sent by a client are not trusted as computed values. Array order is execution order.

## Session semantics

`POST /api/sessions` takes `id`, `flowId`, `flowTitle`, `flowTag`, `subject`, `startedAt`, `durationMinutes`, `focusMinutes`, and `status` (`completed | stopped`). The stable ID makes retrying an uncertain response safe. This local endpoint accepts title/subject snapshots from the runner so an edit or deletion of its source flow cannot rewrite history.

Durations count actual running milliseconds, rounded down to whole seconds before submission. Paused time is excluded. Study time additionally excludes break blocks; skipped block time is never credited. An early finish or any skipped block is recorded as `stopped`, even if the remaining blocks finish. A session needs at least one second and cannot exceed 480 running minutes or its elapsed wall-clock time. The runner retains its own flow snapshot while running.

The timer uses deadlines, advances over delayed ticks, and can pause before a break when auto-start is off. Its active run is retained in session storage in the current tab. It remains mounted across app navigation. Save failures retain the completed run and offer an explicit retry. This does not implement cross-tab locking, offline-first synchronization, or clock-tampering protection; those are follow-up work.

Comprehension/fatigue are integers 1–5; notes are text up to 5000 characters. One reflection can be updated per session. The development adapter saves timestamps in ISO form. Dashboard date ranges and streaks use the browser's local calendar days and study time greater than zero; a streak can end today or yesterday. The weekly chart always shows the last seven days, independently of the summary range.

## Storage and production migration

`DATA_FILE` optionally selects an absolute workspace-file path; otherwise it is `data/workspace.json` relative to the backend working directory. Writes use a temporary file and rename; synchronous transactions serialize requests in **one Node process only**. Do not run multiple writers, use a shared network file, or deploy this adapter to a serverless filesystem. Back up the file before manual edits. Development data is ignored by Git.

The next implementation should follow proposal sections 7 and 11: PostgreSQL + Prisma migrations, the six entities and their ownership relationships, bcrypt/JWT authentication, authorization, account exports and deletion, and then Socket.IO sync. Add a migration path for local JSON and earlier browser-only sessions. Account-scoped IDs/roles and server-side session verification will replace the trust assumptions of this adapter. See [PROJECT_TODO.md](../PROJECT_TODO.md).
