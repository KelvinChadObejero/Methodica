# Copy device study data into an account

Open **Workspace Connection**, log in, and open the account workspace. Select **Review device data**. The review happens in the browser: it reads the device workspace and fetches the current account, without uploading browser records. It lists what will be added, what already exists, any different account versions that will be kept, and the destination email address.

To copy, check the confirmation naming the account, reflection notes and private templates, then select **Copy to my account**. Cancel closes the review without changes. Existing account records and the browser workspace remain intact. The API applies the whole import in one account-scoped PostgreSQL transaction. It never imports passwords, preferences, or an active timer.

## Existing records and retries

Record IDs are preserved, including flow references in historical sessions. Matching IDs are skipped instead of added twice. If the browser and account versions differ, the account version wins; the review lists the difference and leaves the browser version available. Reflection labels are derived consistently; ratings and notes are preserved for new sessions. Templates remain private.

If account data changes after review, the server rejects the stale review before adding anything. Review again to compare with the latest account. Device changes also invalidate the client review. Session expiry or account switching closes the account context; a stale account-scope header cannot write to another user.

If the connection fails after a save, leave the browser data alone and review again. Stable IDs make retrying safe even if the earlier save completed. No import path clears browser storage.

## Boundaries

This imports only the current `methodica-device-workspace-v1` workspace. Arbitrary backup uploads and older legacy storage remain DB-03 follow-up work. Version, IDs, unique records, blocks, dates, durations and reflection fields are validated before writing. The import is limited to 8 MB per request and the existing account limits of 100 flows, 5,000 sessions and 200 private templates. A failed validation/limit check rejects the entire import; it never silently truncates data.

## Kelvin's review checklist

1. In device mode, create a named flow, save a short session, and add a reflection.
2. Log in and open Workspace Connection. Verify the account's existing data is still separate.
3. Review the device data. Check counts, record names and the exact destination email. Cancel once and confirm account history did not change.
4. Review again, confirm and copy. Refresh, log out/in, and find the imported session and reflection in account history.
5. Review a second time: matching records must be skipped, with no duplicate session.
6. Switch back to device mode: the original flow, session and notes must still be present.
7. Repeat with a second account and verify the first account is never altered. A device copy can be explicitly imported into either account; it is never assigned automatically.

Automated tests cover corrupt input, ID conflicts, account limits, owner-bound review tokens, stale snapshots, trusted origins, two users and concurrent retry requests. CI repeats the API transaction tests against PostgreSQL 17.
