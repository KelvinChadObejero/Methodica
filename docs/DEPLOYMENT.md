# Vercel deployment verification

Public website: https://methodica-azure.vercel.app. A green deployment is only a build result; verify runtime and the study journey separately.

## Configuration and migrations

Backend requires DATABASE_URL and BETTER_AUTH_SECRET. Production BETTER_AUTH_URL is the canonical public origin. Preview uses its exact VERCEL_URL/VERCEL_BRANCH_URL plus the canonical origin. Do not trust every vercel.app origin. Use separate signing secrets for production and preview. Secrets remain server-side; never add a VITE_ prefix.

Neon is connected through Vercel. Preview and production currently use the same connected database. Apply only additive, compatible migrations until preview has separate storage. The backend build runs `npm run db:migrate && npm run build`: Prisma applies checked-in migrations using injected credentials, then generates the client and builds. Never run migrate reset in deployment.

## Runtime package

The backend's dedicated output directory is dist/vercel. Its index.cjs is a tiny CommonJS bridge importing server.mjs, a self-contained ESM bundle. Better Auth requires ESM. This also handles Vercel collecting the entry under a CommonJS package scope, which previously caused function startup crashes. npm dependencies are bundled; only Node builtins remain external. Do not point outputDirectory at the wider dist folder, where the builder can select a competing app.js.

Backend tests exercise the exact native entry and a collected isolated CommonJS package scope. Account tests also perform registration and authenticated PostgreSQL reads through the compiled deployment bundle, asserting Secure/HttpOnly production cookies.

## Release checklist

1. Confirm CI is green for the exact head; its account suite uses an isolated PostgreSQL 17 service, including concurrent row-lock writes.
2. Confirm preview migration/build succeeds. Health must report postgresql. Public health, StudyTypes and preview return HTTP 200 JSON; auth/status returns configured=true. Anonymous workspace requests return JSON 401.
3. Register a test student in the browser. Confirm the account label, fresh workspace, useful validation and no device-data upload.
4. Create a flow, run/save a session, add a reflection, refresh and inspect history. Log out/in and confirm the same records. Test another account and ensure private records stay separate.
5. Verify logout/expiry clear private screens, stale tabs cannot write into a changed account, and no plaintext credentials/session tokens appear in localStorage or logs.
6. Repeat the device journey and export without sending device records to private endpoints. Test login/register on a narrow screen and with keyboard input.
7. After review and merge, repeat health/auth and browser checks on the production domain. A working preview does not verify production automatically.

When storage/auth is unconfigured, auth/status returns configured=false and private routes return an intentional JSON 503. Forms explain the unavailable service; public catalog and the explicit device workspace remain usable.

## Storage modes

- Account: PostgreSQL/Prisma workspace scoped to the server-verified user, with revocable cookies. Reload on another browser to load saved progress; automatic live updates are planned.
- Device: explicit localStorage under methodica-device-workspace-v1. It stays separate from accounts and is removed by clearing site data. Export first. Private templates are not public posts.
- Legacy file: explicit local-only demo/test adapter. Never enabled on Vercel.

Account timers use account-ID sessionStorage keys; device timers use their own key. See [AUTH.md](AUTH.md) for remaining email recovery, role, import and retention work.
