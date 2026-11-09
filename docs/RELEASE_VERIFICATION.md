# Private workspace releases — November 9–10, 2026

## Selected-session sharing and student acceptance — November 10

[PR #11](https://github.com/KelvinChadObejero/Methodica/pull/11) completes
M1-02 under the maintainer's explicit selected-session sharing rule. Reviewed
head `52add62a6f0733c00fa084d23a5dbdc32b33fda8` passed both CI sets:
frontend lint/build and 23 tests, PostgreSQL 17 backend lint/build and 14 tests,
and five Chromium journeys. Its exact Vercel preview reached READY; health
reported PostgreSQL and anonymous sharing requests returned 401.

Squash merge `c9210b2c80f0f3a42be94742bff9a729663a2ed6` is the source of
READY production deployment `dpl_5GhhrMgfxtCfWTMTEV1cyeTSfQig`. Its aliases
include [the public Methodica site](https://methodica-azure.vercel.app).
A separate full-Chromium journey against that public domain passed in 2.7
minutes, using only synthetic QA accounts:

1. Register a student, save an ordered two-block flow, complete two actual
   one-minute blocks, and retain one session after losing a committed save
   response and retrying. Refresh/resume, duplicate-tab control, a wall-clock
   jump and permitted transition notifications were exercised again.
2. Recover a failed reflection save, update it after re-login, and reopen the
   same persisted flow/session/notes in a separate 375px browser context.
   A second account starts with no private history and cannot write its log.
3. Look up that second account's code without granting access, explicitly
   confirm the named account and selected session, and keep reflections
   excluded by default. Failed permission reads show unknown state. A
   committed share whose response is lost can be refreshed and retried with
   exactly one grant remaining.
4. Read the selected session as its recipient without editing controls. Opt
   reflection access in, refresh and read the current notes; opt out and
   confirm they disappear on the next read. The ordinary reflection write
   route still returns 404 to the recipient. Both 375px layouts have no
   horizontal page overflow.
5. Revoke the grant and refresh the recipient's detail. Access is denied,
   the previously displayed detail is cleared, and the refreshed shared list
   is empty. The student's private session remains intact.

The API/database suite additionally proves three-account isolation, paginated
received grants, composite ownership foreign keys, deletion cascades and that
imported study data cannot fabricate permissions. See [the policy and API](MENTOR_SHARING.md).
Revocation stops future reads; it cannot erase previously received copies.
These are browser-context checks, not a physical mobile-device or manual
screen-reader test.

This closes **M1-02 and RELEASE-01**. Together with PRs #7–9, six additional
milestone-table tasks are now done. Twelve of the 20 milestone-table tasks are
done; eight remain open. AUTH-RECOVERY is also listed separately (it overlaps
M1-01), followed by three later enhancements: 12 open named checklist entries.
Email recovery still needs an owned verified sending domain. Manual/classmate
QA, physical mobile testing, preview database separation, account deletion and
backup/restore operations remain open; this does not close the whole MVP.

## Timer execution release

[PR #9](https://github.com/KelvinChadObejero/Methodica/pull/9) completes M4-02.
Its reviewed head `34ccc9390a959097979a544fc612676d4aa12f15` passed both CI
sets: frontend lint/build and 22 tests, PostgreSQL 17 backend lint/build and 13
tests, and five Chromium journeys. Squash merge
`698bb6deb4e61fcaa5d23c7175a91c3613729c19` is the source of READY production
deployment `dpl_HMeZ6pfdEr1qd1fcddZVU9LDf5GH`, aliased to the public domain.

A separate full-Chromium production journey completed two real one-minute
blocks, refreshed and explicitly resumed, blocked a duplicate tab, ignored a
one-hour `Date.now()` change, and constructed permitted transition notifications.
A successful database commit whose response was deliberately lost was retried
with the same ID: exactly one session remained, with two completed block records
and four execution events. Reflection failure/recovery, update, re-login, a
separate 375px browser and second-account isolation all passed. The isolation
request uses the actual site's trusted Origin; a localhost Origin was correctly
rejected by CSRF protection during the initial test attempt.

The local/CI device journey additionally closed the owning tab, acquired control
in its duplicate, resumed the original ID, skipped a block and saved one partial
session with matching skip/stop events. The 375px execution timeline was visually
checked. Reopened timers intentionally remain paused and exclude closed-page
time; see [timing and checkpoint limits](TIMER_EXECUTION.md).

At this release, four additional main tasks were done across PRs #7–9: DB-03,
M5-02, S4-02 and M4-02. Mentor permissions were subsequently released in
PR #11, recorded above. Email recovery and manual/operational acceptance
remain open.

## Backup, history and report release

[PR #7](https://github.com/KelvinChadObejero/Methodica/pull/7) and
[PR #8](https://github.com/KelvinChadObejero/Methodica/pull/8) complete DB-03,
M5-02 and S4-02. PR #8's reviewed head
`ac844c20b61178acb9b353ece8d86ade7e81bb05` passed all frontend, PostgreSQL 17
and browser CI checks. Its squash merge
`dbb3e5508285370782798a71cba9a7fbcb84656e` is the recorded source of READY
production deployment `dpl_5ZLu5QLrQmXZqEBwKGyQ8kcD2UXR`, aliased to
[Methodica](https://methodica-azure.vercel.app).

Local checks passed 19 frontend tests, 12 API/database tests and four Chromium
journeys, including a real two-minute run, 5,000 stored sessions, 1,000 batched
new sessions, DST, rollback compatibility, older-page reflections, stale exports,
and CSV counts/minutes matching the selected report. The 375px layout was
visually checked without horizontal overflow.

The exact hosted PR #8 preview passed a separate Chromium check: four reviewed
100-session backup imports, a 25-row overview, paging and an older reflection,
and a 30-day report containing 400 sessions / 200 measured study minutes. The
workspace response was 6,203,485 bytes and CSV 6,050,774 bytes, confirming actual
hosted streaming beyond the buffered response cap. No page errors occurred.

A separate production Chromium check registered a synthetic account, imported
30 sessions, loaded page two and its reflection, and downloaded a matching
30-day CSV (30 sessions / 15 measured minutes, Asia/Taipei). A second account
could not read the first account's session (404), search its records, or include
its effort in reports. There were no page errors or 375px page overflow. These
checks used only synthetic accounts and did not edit existing students' data.

Email recovery still requires an owned verified sender domain. The later timer
and sharing release records above cover execution events and mentor access;
manual/classmate QA and operational acceptance remain open.

## Original database release

[PR #5](https://github.com/KelvinChadObejero/Methodica/pull/5) was reviewed and
squash-merged with maintainer authorization. Application release
`2e7a0332318434f8f0167e2b79db8761fe83f129` deployed successfully to
[Methodica](https://methodica-azure.vercel.app).

Vercel deployment: `dpl_GZxnYmn9VyWJbWHp8JsPcn2aMZiJ`.
The deployment's recorded Git revision matches the squash merge and its aliases
include the public production domain.

## Automated checks

The reviewed PR head passed frontend lint/tests/build, backend lint/tests/build
with PostgreSQL 17, and the three Chromium journeys. The suites include 15
frontend tests and 11 API/database tests. Coverage includes migration and exact
round trips, a 5,000-session history above 8 MB, transaction rollback, concurrent
writes, account isolation, expired-session draft recovery and failed saves.

The exact preview served the application, PostgreSQL health, configured account
service and seven techniques. Anonymous workspace access returned 401.

## Live production browser verification

A separate Chromium run against the public production domain passed:

1. Health returned 200; account status reported `configured=true`; anonymous
   workspace access returned JSON 401.
2. A synthetic QA student registered into a workspace with no session history.
3. The student created two one-minute study blocks, reordered them by dragging
   and keyboard, and saved the exact order to the account.
4. A real two-minute run survived refresh, completed both blocks, and persisted
   one session with `completed` status and two minutes of actual study time.
5. The student saved a reflection, logged out/in, and reopened the same notes in
   history. A separate browser context loaded the same session/reflection.
6. The history page at 375px had no horizontal page overflow. This was browser
   viewport emulation, not a physical mobile-device test.
7. A second synthetic account saw neither the first student's session nor its
   saved flow. Its attempted reflection write to that session returned 404.
8. No JavaScript page errors occurred during the primary journey.

These checks close DB-01, DB-02, WEB-01, M2-02, M3-02 and S3-02 for this release.
The production run used synthetic QA accounts and did not edit existing users.

## Remaining acceptance

RELEASE-01 was subsequently verified with the sharing release above. QA-02
remains in progress: manual screen-reader/contrast review, three-classmate
usability checks and physical-device testing are still open. Email
verification/password reset, preview database separation, account deletion
and backup/restore operations remain on the working checklist. Repeat the
broader deployment checklist for future application releases; each record
here applies to its stated revision.
