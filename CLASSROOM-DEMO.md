# Testing the assignments on separate workstations

The deployed Methodica site has a CRUD Demo screen. It connects from each student's browser to Spring Boot running on that same computer. The website does not host the Spring applications: Vercel currently runs the React frontend and the Express placeholder. Each student's H2 database stays on their own computer; user IDs in the Study Flow exercise are not linked to the separate User database.

The website changes and both Spring projects must first be committed to the GitHub repository and deployed to Vercel. These files alone do not update the live site. Then each student should pull or download that version of the repository on their own workstation. Install a supported JDK (Java 17 or 21 recommended). The included Maven wrapper downloads Maven and project dependencies the first time, so internet access is required.

## Start your own service

Open PowerShell in the project folder. Set the origin to the exact address of the website shown in the browser's address bar, including `https://`, without a trailing slash or path. The example below is a placeholder, not your actual URL. Use the same URL in the browser after starting the server. This allows that site to talk to the local service; leave the service running only during the demo.

For the Study Flow assignment:

```powershell
cd spring-backend
$env:DEMO_ALLOWED_ORIGIN = 'https://your-methodica-site.vercel.app'
.\mvnw.cmd spring-boot:run
```

For the User assignment, on your partner's computer:

```powershell
cd spring-user-backend
$env:DEMO_ALLOWED_ORIGIN = 'https://your-methodica-site.vercel.app'
.\mvnw.cmd spring-boot:run
```

Wait for `Started StudyFlowApplication` or `Started UserApplication`. If Java is not found, install a JDK and set `JAVA_HOME` to its folder. For a local frontend started using Vite on `http://localhost:5173`, omit the environment variable; that origin is the default. If a different local port is used, set the variable to that exact origin instead.

## Demonstrate

1. On that same computer, open the matching website URL and choose **CRUD Demo** in the sidebar.
2. Select **Study flows** or **Users**, as appropriate, and click **Load records**. Only the matching Spring application needs to run.
3. Fill the form with sample data and click **Create record**. The list refreshes from the Spring application.
4. Select **Edit**, change a value and save. Then select **Delete** and confirm. Reload records to demonstrate persistence and deletion.
5. Press Ctrl+C in the service terminal when finished. Each student's saved data belongs to that computer, and is not shared automatically.

If the page cannot connect, confirm the service is running, the correct entity tab is selected, and `DEMO_ALLOWED_ORIGIN` exactly matches the address bar. Restart the service after changing it. Some browser or workstation policies may block a public website from accessing a local service; if so, run the frontend locally on the same computer, or use Postman as documented in the individual project README.

The services bind to `127.0.0.1` only and have no login or access control. The configured origin is allowed to issue CRUD requests to the local service while it is running. Use sample data, use only a website origin you trust, and never expose the services publicly as-is.
