# Vercel deployment verification

The public website is https://methodica-azure.vercel.app. GitHub's Vercel success status confirms that a build was deployed; it does not prove that the deployed API starts or that pages can load their data.

## Runtime entry point

The backend service in `vercel.json` builds with `npm run build` and starts from `backend/index.cjs`. That module exports the CommonJS handler bundled into `dist/server.cjs`. Vercel's runtime logs showed an ESM `app.js` being loaded under a CommonJS package scope (`SyntaxError: Cannot use import statement outside a module`). A single explicitly CommonJS bundle avoids relying on the original package scope when function files are collected. Node dependencies remain external for Vercel's dependency tracing.

`npm test` in the backend first compiles/bundles, then imports the exact deployment entry point in a plain Node process with `VERCEL=1`. A second regression test copies the bundle to an `app.js` under a CommonJS package scope, matching the failed deployed layout. These catch runtime import errors that type checking and the local TypeScript development server do not.

## Verify a deployment before merging or promoting

1. Confirm GitHub CI succeeds for the exact commit.
2. Confirm the Vercel preview build succeeds.
3. Request `/api/health`, `/api/studytypes`, and `/api/preview` on that preview. Each must return HTTP 200 JSON, never a `FUNCTION_INVOCATION_FAILED` response or an HTML page.
4. With cloud storage unconfigured, `/api/workspace` must return an intentional JSON 503. The frontend must show a recovery panel, keep Settings and the technique catalog available, and offer **Use this device**. It must not leave the main page blank or report a successful cloud save.
5. Opt into a device workspace. Create a flow, run/save a session, save a reflection, refresh, and reopen history. Verify JSON/CSV export uses device records. Device records must not be sent to a private workspace API endpoint.
6. Test the production domain again after merge/promotion. Do not infer production behavior only from a local build or green deployment status.

## Storage modes

- **Local API:** one development workspace in the backend file. Not suitable for public multi-user hosting.
- **Device:** explicit browser storage under `methodica-device-workspace-v1`; mode selection under `methodica-workspace-mode`. Data is private to that browser profile, is not cross-device synced, and is removed by clearing site data. Templates saved to this collection are not public posts. Export a backup first. Corrupt or full browser storage fails visibly and never silently resets existing records.
- **Hosted accounts/database:** still pending PostgreSQL/Prisma, ownership enforcement, and authentication. Do not enable the file adapter on Vercel or claim device mode implements cloud sync. Existing device/API timer runs use separate session-storage keys to avoid mixing their saves.

Vercel team access is needed to inspect runtime logs and environment-variable names. Confirm whether a database is provisioned and `DATABASE_URL` exists; never paste connection secrets into issues, PR descriptions, or chat. A variable's presence alone does not implement the database adapter.
