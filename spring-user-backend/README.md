# User Spring Boot CRUD

This is the retained standalone individual exercise. For the November 11 Increment 1 check, use the integrated six-entity application in `spring-backend` instead; see [the runbook](../docs/INCREMENT_1_HANDOFF.md). Its records are separate from this exercise's database.

For the website-based classroom demo on separate workstations, see [CLASSROOM-DEMO.md](../CLASSROOM-DEMO.md).

This independent classroom project implements User, StudySession, and SessionLog from Methodica's ERD. A user owns sessions; each session keeps historical flow labels and has at most one reflection. The database generates user IDs, the timer supplies stable session IDs, and the server derives reflection labels from session data. It follows the assignment's four packages:

```
src/main/java/com/methodica/user/
  entity/       User, Role, StudySession, and SessionLog
  repository/   database operations
  service/      CRUD logic and password hashing
  controller/   HTTP endpoints, validation, and response data
```

The user's password is supplied as `password`, stored as a BCrypt hash, and never returned in API responses. Emails are normalized to lowercase and must be unique. Roles are `STUDENT`, `MENTOR`, and `ADMIN`. These role values are an assignment convention based on the proposal; no role-based access is implemented.

## Run

Install Java 17 or 21 and Maven, then from this folder run:

```powershell
mvn spring-boot:run
```

On the current workstation, the local Maven used for the Study Flow assignment can also be used:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-18.0.2'
& '../tmp/maven/apache-maven-3.9.11/bin/mvn.cmd' '-Dmaven.repo.local=../tmp/maven-repository' spring-boot:run
```

The API runs on `http://localhost:8081`, so it can run alongside the Study Flow demo on port 8080. An H2 file database persists in this project's `data` folder. Run `mvn test` for the integration test. The two demos use separate databases and are not yet integrated.

## Study sessions and reflections

These endpoints follow the local teaching app's unauthenticated convention. Pass `userId` to reads and mutations to scope records; this is not authentication and is suitable only for sample data.

| Action | Method | URL | Expected result |
| --- | --- | --- | --- |
| Create or safely retry a session | POST | `/api/sessions` | 201 new, 200 exact retry, 409 if the ID has different data |
| List a user's sessions | GET | `/api/sessions?userId=1` | 200, newest first |
| Read a session | GET | `/api/sessions/{id}?userId=1` | 200, or 404 |
| Save or update reflection | PUT | `/api/sessions/{id}/log?userId=1` | 200 with session and reflection |
| Read reflection | GET | `/api/sessions/{id}/log?userId=1` | 200, or 404 |
| Delete reflection or session | DELETE | `/api/sessions/{id}/log?userId=1` or `/api/sessions/{id}?userId=1` | 204, or 404 |

Session creation accepts `id`, `userId`, `flowId`, `flowTitle`, `flowTag`, `startedAt`, `durationMinutes`, `focusMinutes`, `subject`, and `status` (`completed` or `stopped`). Duration must be 1 second–480 minutes, focus cannot exceed duration, and duration cannot exceed elapsed time. Reflection input is `{ "comprehension": 1, "fatigue": 1, "notes": "" }`; ratings are 1–5 and notes are limited to 5,000 characters. Reflection title and subtitle are derived from the session rather than accepted from the client. Deleting a session also deletes its reflection.

## Demonstrate CRUD

Use Postman or a similar tool with `Content-Type: application/json`. Replace `1` with the returned user ID.

| Action | Method | URL | Expected result |
| --- | --- | --- | --- |
| Create | POST | `/api/users` | 201 with user and Location header |
| Read all | GET | `/api/users` | 200 with list |
| Read one | GET | `/api/users/1` | 200, or 404 if missing |
| Update | PUT | `/api/users/1` | 200, or 404 if missing |
| Delete | DELETE | `/api/users/1` | 204, or 404 if missing |

Example POST body:

```json
{
  "name": "Alex Student",
  "email": "alex@example.com",
  "password": "classroom123",
  "role": "STUDENT"
}
```

For PUT, provide name, email and role; omit `password` or set it to `null` to keep the current password, or supply a new password to replace it. Passwords must be at least 8 characters and at most 72 UTF-8 bytes. Invalid input returns 400; an existing email returns 409 in ordinary sequential requests.

This is a local teaching exercise. It has no login, authentication, or authorization: anyone who can reach the API can read, change, or delete users and assign roles. Use only sample data and do not deploy it for real users. Production integration needs access control, migrations, proper user-flow relationships, and a reviewed security design.
