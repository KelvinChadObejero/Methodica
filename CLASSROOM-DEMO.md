# Classroom backend demo

For Increment 1 on November 11, use [the six-entity runbook](docs/INCREMENT_1_HANDOFF.md). Start **only `spring-backend`**; it contains all six core entities and their relationships in one local database.

## Website User and StudyFlow screen

The website's **CRUD Demo** screen uses `http://127.0.0.1:8080` for both tabs. Each student's browser connects to Spring Boot running on that same computer. The website does not host Spring or share these local records between workstations.

For the deployed site, start Spring from PowerShell:

```powershell
cd spring-backend
$env:DEMO_ALLOWED_ORIGIN = 'https://methodica-azure.vercel.app'
.\mvnw.cmd spring-boot:run
```

For a different preview/custom domain, use its exact trusted browser origin, including `https://` and excluding paths/trailing slashes. For the local Vite frontend at `http://localhost:5173`, omit the environment variable; that origin is the default. Restart Spring after changing the origin.

1. Wait for `Started StudyFlowApplication`, then open the matching website and choose **CRUD Demo**.
2. On **Users**, create a sample user and note the returned ID.
3. Switch to **Study flows**, use that ID, and create a flow. Unknown user IDs return 404.
4. Edit and save each record. Delete the flow before its user; a referenced user returns 409.
5. Restart Spring and load records to demonstrate persistence. Stop it with Ctrl+C when finished.

The deployed website must include the updated common API address from this PR. A locally running frontend from this checkout already uses it. For StudyType, StudyBlock, StudySession, and SessionLog, use Postman or `scripts/demo-increment-one.ps1` as documented in the runbook.

If connection fails, confirm Spring is running, `DEMO_ALLOWED_ORIGIN` matches the browser origin, and the browser permits local network access. Workstation/browser policies may require using the frontend locally or demonstrating with Postman instead.

The service binds to `127.0.0.1` and has no login/access control. Use sample data and a trusted website origin. The original `spring-user-backend` remains an independent earlier exercise on port 8081; it is not needed for the integrated Increment 1 demo and uses its own records.
