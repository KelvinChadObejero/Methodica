# Vercel deployment verification

Public website: https://methodica-azure.vercel.app. A green deployment is only a build result; verify runtime and the study journey separately.

## Configuration and migrations

Backend requires DATABASE_URL and BETTER_AUTH_SECRET. Production BETTER_AUTH_URL is the canonical public origin. Preview uses its exact VERCEL_URL/VERCEL_BRANCH_URL plus the canonical origin. Do not trust every vercel.app origin. Use separate signing secrets for production and preview. Secrets remain server-side; never add a VITE_ prefix.

Neon is connected through Vercel. A separate empty resource `methodica-preview` was connected to Preview under the `PREVIEW_` prefix on 2026-11-10; the original resource remains connected to both environments. The local code selects only prefixed preview URLs and checks that the pooled and unpooled preview URLs refer to the same database and differ from the unprefixed production URL before migrations. These changes are not yet deployed or verified on Vercel. Existing deployments may still use the shared original database. Production builds continue to use the unprefixed connection. Never run migrate reset in deployment.

## Runtime package

Hosted Prisma CLI commands select the Marketplace's `DATABASE_URL_UNPOOLED`
(or `POSTGRES_URL_NON_POOLING`) for migrations; application queries continue to
use pooled `DATABASE_URL`. Local/test CLI commands use their explicit
`DATABASE_URL`, so disposable databases do not pick up hosted credentials.
This prevents session-scoped migration advisory locks from being stranded
behind transaction pooling. Do not disable advisory locking to bypass a build
failure. See [Neon's Prisma guide](https://neon.com/docs/guides/prisma).

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
## OPS-01: isolation and recovery work plan

Inspection on 2026-11-10: Vercel lists the same Neon integration-backed `DATABASE_URL` and unpooled migration URL for both preview and production. Separate preview and production entries exist for the authentication signing secret, but their values were not inspected. This configuration does not establish database isolation. The production deployment is marked ready; this is not a backup or restore verification.

### Separate preview storage

1. Inventory the current Neon resource and Vercel integration connection, including its environment targets and any existing preview-specific overrides. Record resource identifiers privately, not connection strings. Check plan limits and any cost before provisioning.
2. The new empty preview resource supplies prefixed runtime and unpooled migration URLs. Its integration connection targets Preview only. Do not copy production accounts or private data into preview. Review credentials and fallback behavior before deployment; leave production settings untouched.
3. Deploy a reviewed preview revision; confirm the URL check and migrations target the preview database and apply successfully. Verify the preview's database identity against production using a privileged operator's private inspection, without exposing credentials, database IDs or diagnostics publicly. A test record created in preview must appear only there; production data must remain unchanged. Confirm production health and sign-in afterward.
4. Record the preview deployment, revision, test time and result here. Existing deployments retain their previous configuration; do not assume changing environment settings retroactively isolates them. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

### Recovery rehearsal

1. Establish the actual provider plan, history retention window, recovery point and recovery time objectives, backup schedule, operator access and encrypted backup location. A database branch alone is not evidence of an independent backup. Confirm provider capabilities and costs before making resources.
2. Use a disposable, isolated database containing synthetic accounts, flows, blocks, sessions and reflections. Capture a known state and time, make a controlled change, and restore the captured state to a **new isolated destination** using the selected provider recovery method. Never run the rehearsal against the production destination.
3. Verify schema/migration state, record counts and relationships; run the authenticated two-account journey and confirm isolation. Check that restored data represents the intended point in time. Record timestamps, method, outcome and elapsed recovery time, without credentials or private user data. Destroy the disposable resources only after their identities are confirmed.
4. Separately document and test the production incident procedure with the team: access control, maintenance mode, recovery destination, validation, cutover, communication, and handling writes after the recovery point. A deployment rollback does not undo a database migration; confirm migration compatibility before switching application revisions.

The separate preview resource is connected, but the code and isolation have not yet been deployed or verified end to end; no backup/restore test has been completed. Keep OPS-01 in progress until the above evidence and its remaining security, logging and rollback acceptance criteria are satisfied.
