# Study Flow Spring Boot CRUD

For the website-based classroom demo on separate workstations, see [CLASSROOM-DEMO.md](../CLASSROOM-DEMO.md).

This standalone assignment implements the StudyFlow entity from the proposal's ERD. It is separate from the existing Express scaffold, because the proposal describes Express as the team's proposed backend while this assignment requires Spring Boot. Choosing the production stack remains a team decision.

## Structure

```
src/main/java/com/methodica/studyflow/
  entity/       StudyFlow and its database fields
  repository/   Spring Data database operations
  service/      CRUD logic and missing-record handling
  controller/   REST endpoints and request validation
```

The ERD fields are `flowId`, `userId`, `title`, `description`, `isPublic`, and `createdAt`. The database generates `flowId`; the server sets `createdAt`. For this single-entity exercise, `userId` is a positive number, not an enforced foreign key: no User table or login exists yet. Study blocks and sessions are outside this exercise. The API has no authentication or authorization and must not be exposed to real users as-is; anyone who can access it can read and change every flow, including private flows. The PUT operation currently permits changing `userId` for demonstration purposes.

## Run locally

Install a JDK supported by Spring Boot 3.5 (Java 17 or 21 recommended) and Maven 3.6.3 or newer. In a terminal:

```powershell
cd spring-backend
mvn spring-boot:run
```

The API listens at `http://localhost:8080`. The default H2 file database is created in `spring-backend/data` and persists across restarts. It is intended for the classroom demo, not production. Run `mvn test` to execute the integration test.

For this workstation, Maven was downloaded locally for the assignment. From `spring-backend`, you can use it with the installed Java 18 instead of installing Maven globally:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-18.0.2'
& '../tmp/maven/apache-maven-3.9.11/bin/mvn.cmd' '-Dmaven.repo.local=../tmp/maven-repository' spring-boot:run
```

The local Maven download and cache in `tmp` are not part of the repository; teammates can use their own Maven installation and the standard command above.

Optional PostgreSQL development setup, matching the proposal's database preference: create an empty database and set `DB_URL` (for example `jdbc:postgresql://localhost:5432/methodica`), `DB_USERNAME`, and `DB_PASSWORD`, then run `mvn spring-boot:run "-Dspring-boot.run.profiles=postgres"`. Both profiles use automatic schema updates for development; use migrations and an enforced user relationship before deployment.

## Demonstrate the CRUD

Send JSON with `Content-Type: application/json`, using Postman or a similar client. Replace `1` with the ID returned by creation.

| Operation | Method | URL | Result |
| --- | --- | --- | --- |
| Create | POST | `/api/flows` | 201 and the created flow |
| Read all | GET | `/api/flows` | 200 and a list |
| Read one | GET | `/api/flows/1` | 200 or 404 |
| Update | PUT | `/api/flows/1` | 200 or 404 |
| Delete | DELETE | `/api/flows/1` | 204 or 404 |

Use this body for POST or PUT (PUT replaces all editable fields):

```json
{
  "userId": 1,
  "title": "Biology active recall",
  "description": "Review key concepts before the quiz",
  "isPublic": false
}
```

`userId`, `title`, and `isPublic` are required; description may be null. Invalid input returns 400. Responses include the generated `flowId` and `createdAt`. The public flag is stored but does not provide access control. No frontend integration or production security is implemented yet.
