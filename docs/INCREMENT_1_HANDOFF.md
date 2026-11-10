# Increment 1 teammate handoff

Kelvin's classroom backend implements StudyFlow, StudyType and StudyBlock CRUD in `spring-backend`. Andrei's User exercise remains in `spring-user-backend`. The two applications run separately on port 8080, use separate local H2 databases, and do not yet enforce the ERD relationship between a flow and its user. Coordinate the integration before changing either database or claiming the User foreign key is enforced.

## Run Kelvin's service

1. Check out the reviewed branch or merge commit, install Java 17 or 21, and open a terminal in `spring-backend`.
2. Run `./mvnw spring-boot:run` on macOS/Linux or `.\mvnw.cmd spring-boot:run` in Windows PowerShell. The first run downloads Maven and dependencies.
3. Use the requests and JSON in [the backend README](../spring-backend/README.md). Create a flow and a study type first; use their returned IDs to create a study block. Demonstrate GET, PUT and DELETE for each entity. Delete the block before its parent flow or type. Restart the app to show the H2 data persists.
4. Stop the service before starting the User exercise, which also uses port 8080. The website classroom screen supports flows and users; use an HTTP client for StudyType and StudyBlock.

The classroom services are local demonstrations with no authentication. Use sample data and do not expose them publicly. `userId` in the flow is currently a positive number, not a verified user. The course metadata for the study backend is `com.it342g02.methodica:methodica`. The standalone User backend uses the same group and its own `user-api` artifact.

## Coordinate next

Agree how the two exercises will share User records and what should happen when a User with flows is deleted. Choose a single database and a migration path that preserves existing classroom records before enforcing the foreign key. Do not point either exercise at the website's production database. After integration, test creation with a real user ID, rejection of an unknown ID, deletion behavior, and both apps' existing CRUD paths.
