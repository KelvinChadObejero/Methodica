# Selected-session mentor access (M1-02)

The maintainer approved this rule on November 9, 2026: a student explicitly
shares selected sessions with a named mentor, with read-only access that can be
revoked. This does not create a privileged mentor role or grant library access.
Registration still grants no privileged role.

## Student and mentor flow

1. The mentor opens **Shared with me** and gives their Methodica account code
   to the student through their existing communication channel.
2. In account Session History, the student chooses **Share session**, enters
   that code and finds the named account. Nothing is shared during lookup.
3. The student confirms that the account belongs to their intended mentor and
   explicitly checks **Share only this session** before confirming read-only
   sharing. Reflection notes/ratings are excluded by default. Including them
   explicitly also shares later reflection updates.
4. The mentor opens/refreshes **Shared with me** and views only that session's
   historical summary, planned blocks and recorded execution. Reflection
   content appears only when its owner included it. There are no editing,
   publishing or onward-sharing controls.
5. The student can change reflection access or revoke the grant. Each later
   API read checks the recipient and current grant again. Refreshing a revoked
   detail clears the displayed content and explains that access ended.

Account codes identify existing accounts; having a code alone grants no private
study access. Codes avoid relying on unverified email addresses while recovery
email is pending. The student confirms the code directly with their mentor.
No email, invitation message or notification is sent by this feature.

Revocation stops future access. It cannot erase copies already read or saved.
An already-open browser view is previously received data; its next refresh is
re-authorized. Live change events remain S1-01. Sharing is account-only: device
workspaces never silently upload data or grant access.

## API and ownership

All routes require a verified account session. Writes require a trusted Origin;
the existing optional account-scope header must match the session.

| Method | Route | Result |
| --- | --- | --- |
| GET | `/api/sharing/profile` | Own `{code,name}`, without an email address. |
| GET | `/api/sharing/recipient?code=...` | Preview the code's named account; grants nothing. |
| GET | `/api/sessions/:id/shares` | Owner-only grant list for this selected session. |
| POST | `/api/sessions/:id/shares` | `{recipientCode,includeReflection}` creates/updates one explicit grant. Repeats keep its ID. |
| PUT | `/api/sessions/:id/shares/:shareId` | Owner changes the reflection permission. |
| DELETE | `/api/sessions/:id/shares/:shareId` | Owner revokes access; success is 204. |
| GET | `/api/shared-sessions?offset=0` | Current recipient's 25-row page: `{items,total,nextOffset}`. |
| GET | `/api/shared-sessions/:shareId` | Current recipient's authorized read-only detail. Unknown/revoked grants return 404. |

The ordinary workspace, session, flow, reflection, backup and report routes
remain owner-only. Shared effort never enters the mentor's own analytics or
history. A grant does not allow edits, deletion, sharing onward, bulk export of
the owner's workspace, or reading another session. Detail DTOs omit the owner's
private session/flow IDs and reflection-presence metadata when not shared.

Owners may grant up to five people per session and 100 active grants per
account. Grants are unique per owner/session/recipient, and owner-row locks
serialize concurrent changes. The composite session foreign key includes its
owner. Session/owner deletion removes grants; recipient deletion removes their
grants without deleting the student's data.

Permissions live outside Workspace JSON. Study-data exports/imports never
restore or fabricate grants. Recreating a deleted session or restoring a
wholesale older workspace requires fresh owner consent. The additive sharing
table is compatible with existing study readers/writers.

## Verification

API/database coverage uses a student, named mentor and unrelated account:
default reflection exclusion, explicit opt-in and later updates, opt-out,
revocation, duplicate grants, private-route denials, CSRF, source-flow deletion,
malicious permission fields in imports, and deletion cascades. The browser
student journey continues from its persisted session through named-account
confirmation, read-only viewing, reflection permission changes and revocation,
with 375px owner/mentor layouts. Existing account, history, reporting and timer
regressions remain required.
