# User Spring Boot CRUD

For the website-based classroom demo on separate workstations, see [CLASSROOM-DEMO.md](../CLASSROOM-DEMO.md).

This independent classroom project implements the User entity from Methodica's ERD: `userId`, `name`, `email`, `passwordHash`, `role`, and `createdAt`. The database generates the ID and the server sets the creation time. It follows the assignment's four packages:

```
src/main/java/com/methodica/user/
  entity/       User and Role
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
