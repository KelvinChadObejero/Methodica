# Methodica Increment 1 Spring backend

Complete classroom CRUD for the six proposal entities: **User, StudyFlow, StudyType, StudyBlock, StudySession, and SessionLog**. All endpoints and database foreign keys run in this application on port 8080. See [the November 11 runbook](../docs/INCREMENT_1_HANDOFF.md) for request bodies, endpoint coverage, deletion rules and the demo sequence.

The intentional Maven coordinates remain `com.methodica:study-flow-api`, and Java packages remain `com.methodica.studyflow`. The announcement's metadata pattern has not been applied.

## Run

Install Java 17 or 21. From this folder:

```powershell
.\mvnw.cmd spring-boot:run
```

The wrapper downloads Maven/dependencies on first use. If Maven is already installed, `mvn spring-boot:run` also works. The loopback API listens at `http://127.0.0.1:8080`. From a second terminal at the repository root:

```powershell
.\scripts\demo-increment-one.ps1
```

The script checks CRUD for all six entities and removes its sample records. The website's **CRUD Demo** screen supports users and flows on this same service; create a user before a flow. See [website connection setup](../CLASSROOM-DEMO.md).

## Database and structure

The default H2 file database is `data/methodica-increment-one.mv.db`, relative to this folder. This new database preserves the earlier flow-only `data/methodica.mv.db` and the standalone User application's data. Old records are not automatically imported. All six entities now share the new database. User/flow/type dependencies are checked by the service and enforced with database foreign keys.

```text
src/main/java/com/methodica/studyflow/
  entity/       six core entities and role/session status enums
  repository/   Spring Data persistence
  service/      CRUD, relationships, hashing and validation
  controller/   REST endpoints, request/response DTOs and CORS
```

User passwords are BCrypt hashed and never returned. Flows require real users; sessions require real flows belonging to their user. Delete dependent sessions/blocks before flows, and flows before users/types. Referenced-parent deletions return 409; session deletion cascades to its reflection. Logs have generated IDs and timestamps, and one log is allowed per session. Session end times are persisted from start plus duration.

For optional PostgreSQL development, create a **new empty classroom database**, set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`, then run `mvn spring-boot:run "-Dspring-boot.run.profiles=postgres"`. The development schema uses automatic updates; do not point it at an older exercise database or the production website database.

This local teaching API has no authentication/authorization. Use sample records. The website continues to use its independent Express API for production features; `spring-user-backend` is retained as the original individual exercise and is not required here.

## Verify

```powershell
.\mvnw.cmd verify
```

Eleven tests cover CRUD, validation, foreign keys, owner checks, conflict handling and all-six-entity restart persistence using temporary databases. The live HTTP demo passes 44 checks. See the runbook for exact requests and supported fields.
