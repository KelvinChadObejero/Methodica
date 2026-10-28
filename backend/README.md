# Methodica account and study API

Express + TypeScript, PostgreSQL, Prisma and Better Auth. Every account has its own workspace. Public health, technique catalog and starter preview do not require a login.

## Local development

Run `npm ci`, then `npm run dev:local` in backend. This starts persistent local Prisma Postgres, applies migrations, and runs the API on `127.0.0.1:4000`. Start the frontend separately and open `http://localhost:5173`. Local database data stays on your machine. The generated signing secret lives in ignored `backend/data/local-auth-secret`. This command never uses the production database.

For your own PostgreSQL instance, copy `.env.example` to ignored `.env`, set DATABASE_URL, a random BETTER_AUTH_SECRET of at least 32 characters, and BETTER_AUTH_URL to the frontend origin. Run `npm run db:migrate`, then `npm run dev`. Build generates Prisma Client, type-checks and bundles; `npm start` runs compiled code with environment supplied by your process manager.

The old unauthenticated file adapter requires ALLOW_LOCAL_WORKSPACE=true outside Vercel. It is never a production fallback and its records are never automatically assigned to an account.

## Accounts

Registration signs in immediately. Better Auth normalizes emails and hashes passwords with scrypt; passwords require 12–128 characters. Revocable seven-day sessions use HttpOnly, SameSite=Lax cookies, Secure on hosted HTTPS. Database-backed throttling limits login and registration across function instances. Private writes validate Origin; ownership always comes from the session. Workspace documents use PostgreSQL JSON with row locks for concurrent updates.

Email verification/reset, mentor roles, normalized study tables, device imports and automatic live synchronization remain follow-up work. See [AUTH.md](../docs/AUTH.md) and [API.md](../docs/API.md).

## Deployment

Connect Neon to Methodica in Vercel. Required variables: DATABASE_URL, BETTER_AUTH_SECRET, and production BETTER_AUTH_URL=https://methodica-azure.vercel.app. Preview and production use different signing secrets; preview trusts only its exact deployment/branch origins. Never expose secrets through VITE_ variables.

Vercel applies checked-in migrations before building. Preview and production currently share the connected database, so migrations must remain additive and compatible with main. Separate preview storage before destructive changes; never reset during a deployment.

The native CommonJS bridge dist/vercel/index.cjs imports a self-contained ESM server.mjs, as Better Auth requires ESM. The dedicated output directory prevents Vercel from selecting another generated entry. See [deployment verification](../docs/DEPLOYMENT.md).

## Checks

Run `npm run lint`, `npm test`, and `npm run build`. Legacy API tests use a temporary file; account tests use disposable local Prisma Postgres, or CI's isolated PostgreSQL 17 service via TEST_DATABASE_URL. Tests never use a developer's DATABASE_URL. Coverage includes registration, validation, duplicate emails, generic login errors, cookies, logout/revocation, expiry, two-user ownership, origin checks, concurrent writes, persistence, database throttling and the exact hosted bundle with database requests.
