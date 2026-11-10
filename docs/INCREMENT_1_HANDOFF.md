# Increment 1 — November 11, 2026

`spring-backend` is the complete classroom backend: **User, StudyFlow, StudyType, StudyBlock, StudySession, and SessionLog**, with CRUD and database foreign keys in one application. It reuses Andrei's user/session work and the laboratory branch's study type/block work. The website's production API remains Express/PostgreSQL.

Maven metadata is intentionally preserved as `com.methodica:study-flow-api`; Java packages remain `com.methodica.studyflow`. The older `spring-user-backend` exercise is retained independently and is not needed for this demo.

## Start the demo

Install Java 17 or 21. From the repository root:

```powershell
cd spring-backend
.\mvnw.cmd spring-boot:run
```

Wait for `Started StudyFlowApplication`. The API runs at `http://127.0.0.1:8080`. In a second PowerShell terminal at the repository root:

```powershell
.\scripts\demo-increment-one.ps1
```

Expected final line: `All six entities passed CRUD (44 HTTP checks). Demo records removed.` The script creates fresh records, checks create/read/update/delete for every entity, validates unknown references, duplicate positions, session retries and deletion conflicts, and removes its own sample records. It attempts cleanup if a check fails. No website or Express server is required.

For a manual demonstration, use Postman and `Content-Type: application/json`. Create a User, StudyFlow, StudyType and StudyBlock, then a StudySession and its SessionLog. Use the returned IDs. Choose a unique session ID and a start time at least as far in the past as the session duration. Demonstrate PUT and GET before deleting the log/session, block, type, flow and user, in that order.

The website's **CRUD Demo** screen also uses this one application for its User and StudyFlow tabs. Create a user first, then enter that user's ID in the flow form. Demonstrate the remaining entities with the script or Postman. For a hosted frontend, set `DEMO_ALLOWED_ORIGIN` to the exact trusted website origin before starting Spring; see [CLASSROOM-DEMO.md](../CLASSROOM-DEMO.md).

## Data and persistence

Run Spring from `spring-backend/` so its file database is consistently stored in `spring-backend/data/methodica-increment-one.mv.db`. Stop and restart the application to show records persist. This new database keeps the earlier flow-only database (`data/methodica.mv.db`) and the standalone User exercise database untouched. Old records are not automatically imported; create fresh sample records for this integrated demo. Do not point the new schema at those older databases or at the website's production database.

These local services have no login or authorization. User IDs scope classroom requests; they are not authentication. Use sample data.

## CRUD endpoints

All endpoints below use port 8080.

| Entity | Create / list | Read / update / delete |
| --- | --- | --- |
| User | POST / GET `/api/users` | GET / PUT / DELETE `/api/users/{id}` |
| StudyFlow | POST / GET `/api/flows` | GET / PUT / DELETE `/api/flows/{id}` |
| StudyType | POST / GET `/api/studytypes` | GET / PUT / DELETE `/api/studytypes/{id}` |
| StudyBlock | POST / GET `/api/blocks` | GET / PUT / DELETE `/api/blocks/{id}` |
| StudySession | POST `/api/sessions`; GET `/api/sessions?userId=…` | GET / PUT / DELETE `/api/sessions/{id}?userId=…` |
| SessionLog | POST `/api/sessions/{id}/log?userId=…`; session lists include logs | GET / PUT / DELETE the same log URL |

New records return 201 with Location; reads and updates return 200; deletion returns 204. Invalid input returns 400, unknown records/references return 404, and conflicts return 409. An exact session POST retry returns 200; a reused ID with different data returns 409. Reflection PUT also supports upsert for compatibility with the original session client.

User POST body:

```json
{"name":"Alex","email":"alex@example.com","password":"classroom123","role":"STUDENT"}
```

User PUT accepts the same fields; omit password to retain it. Passwords are BCrypt hashed and hashes are never returned. Emails are normalized and unique. Roles are `STUDENT`, `MENTOR`, and `ADMIN` for this classroom exercise.

Flow POST/PUT body:

```json
{"userId":1,"title":"Biology recall","description":"Review","isPublic":false}
```

Type POST/PUT body:

```json
{"title":"Active recall","description":"Retrieve from memory","scientificBasis":"Retrieval practice","defaultDuration":25}
```

Block POST/PUT body:

```json
{"flowId":1,"studyTypeId":1,"sequenceOrder":0,"durationMinutes":25,"customInstruction":"Practice questions"}
```

Session POST/PUT body (replace the date and returned IDs):

```json
{"id":"demo-session-1","userId":1,"flowId":1,"flowTitle":"Biology recall","flowTag":"Biology","startedAt":"2026-11-11T00:00:00Z","durationMinutes":30,"focusMinutes":25,"subject":"Biology","status":"completed"}
```

Session PUT takes the full body; its ID and owner cannot change. `flowId` is numeric and must reference a flow owned by that user. Status is `completed` or `stopped`. Duration is 1 second–480 minutes; focus cannot exceed duration; duration cannot exceed elapsed time. `endedAt` is derived from start plus duration and persisted. Existing log notes/ratings survive corrections and their display labels refresh.

Log POST/PUT body:

```json
{"comprehension":4,"fatigue":2,"notes":"Useful practice"}
```

Ratings are 1–5; notes are at most 5,000 characters. The server generates `logId` and `loggedAt`; updates preserve both. Only one log can exist per session. Title/subtitle are derived from the session.

## ERD and deletion rules

The implementation follows the six entities and relationships in figure 2 of Methodica Proposal v2. All parent references are enforced by database foreign keys. Session IDs remain client-generated strings to support safe timer retries; the ERD does not prescribe their storage type. JSON names use camelCase; rating/note database columns use the proposal's `comprehension_rating`, `fatigue_rating`, and `reflection_notes` names.

- Flows must reference an existing user. A user with flows cannot be deleted (409).
- Blocks must reference an existing flow and type. Their sequence orders start at zero and are unique per flow. Durations are 1–120 minutes. `GET /api/blocks?flowId=…` returns ordered blocks. Referenced flows/types cannot be deleted (409).
- Sessions must reference an existing user and an existing flow belonging to that user. A flow with sessions cannot be deleted or reassigned to another owner (409).
- Logs have their own generated primary key, a unique session foreign key, and a creation timestamp. Deleting a session cascades to its log. Deleting just a log preserves the session and permits a new reflection. A session may temporarily have no reflection while the user is preparing one.

Validation bounds, deletion restrictions, snapshot labels and optional pre-reflection sessions are documented implementation choices around the proposal schema.

## Verification

```powershell
cd spring-backend
.\mvnw.cmd verify
```

Verified locally on November 10 with Java 17: **11 tests pass** and the executable JAR builds. Coverage includes core CRUD, password handling, validation, owner checks, duplicate logs/positions, failed-update preservation, deletion/recreation and database rejection of orphan references. A temporary file-database test verifies all six entities and session corrections survive full application restarts, followed by persistent deletion. Tests do not use saved classroom records.

The PowerShell demo also passed **44 live HTTP checks** against the packaged JAR with a disposable database. Use `-Api http://127.0.0.1:18080` to target a different local port. GitHub Actions runs `mvn verify` for the integrated backend and the retained standalone User exercise. The frontend's lint/build checks cover the updated common API address.
