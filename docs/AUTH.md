# Account foundation

The website supports email/password registration, login, logout, restored sessions and private account workspaces. This keeps the proposal's Express, PostgreSQL and Prisma direction. It uses **Better Auth's database sessions and scrypt password hashing** instead of the proposal's custom bcrypt/JWT implementation: the library handles session cookies, revocation, expiry, hashing, origin protection and throttling together. The browser never stores bearer tokens in localStorage. Mobile authentication remains follow-up work.

## Data boundary

Better Auth owns User, Account, Session, Verification and RateLimit tables. StudyFlow, StudyBlock, StudyType, StudySession and SessionLog hold study data with composite owner-scoped keys and cascading ownership. The API derives ownership from the verified session, never from a body or account-scope header. A Workspace row lock serializes writes across function instances; its JSON document remains a compatibility mirror for rolling upgrades and rollback. See [DATA_MODEL.md](DATA_MODEL.md) for the schema, deletion rules, migration and retained HTTP contract.

Registration starts a fresh account workspace. Existing device data stays separate and is never silently uploaded. Users can explicitly review and copy the current browser workspace, JSON backups and original legacy session records from Workspace Connection; see [DEVICE_IMPORT.md](DEVICE_IMPORT.md). Legacy estimates do not claim measured study time. Saved templates are private copies, not public community posts.

## Browser and session behavior

Passwords require 12–128 characters; registration includes confirmation, accessible labels and autocomplete. Login accepts existing passwords without the registration-only minimum. Errors retain input for correction. Unconfigured accounts have a clear unavailable state. Logout revokes the server session and clears rendered account data. Expiration returns API 401 and closes the protected workspace. Tabs notify each other about account changes; an optional account-scope header prevents stale-tab writes. Timer storage is scoped to the account ID, separately from device timers.

Hosted cookies are HttpOnly, Secure, SameSite=Lax and hostname-scoped. Sessions expire after seven days and refresh after a day of use. Preview and production use separate signing secrets. Only exact known Methodica origins are trusted; shared `*.vercel.app` origins are not accepted. Private workspace writes require a trusted Origin. Database-backed auth throttling uses Vercel's trusted `x-real-ip`, with a shared bucket for local requests without a trusted IP.

## Remaining work

- Configure email delivery, verification and password reset, then test recovery end to end.
- Agree on mentor/admin permissions; registration cannot grant a privileged role.
- Add account deletion, retention and backup/restore procedures.
- Separate preview storage before incompatible migrations; connected preview/production currently share the database.
- Finish mobile login and release acceptance in the checklist. Unsaved builder/reflection drafts recover in the same tab, scoped separately to each account and device workspace; they are not database saves and disappear when the tab closes.

References: [Express integration](https://better-auth.com/docs/integrations/express), [Prisma adapter](https://better-auth.com/docs/adapters/prisma), [sessions](https://better-auth.com/docs/concepts/session-management), [rate limits](https://better-auth.com/docs/concepts/rate-limit).
