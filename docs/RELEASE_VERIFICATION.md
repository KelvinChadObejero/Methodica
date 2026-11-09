# Private workspace release — 2026-11-09

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

Email recovery still requires an owned verified sender domain. M4 execution
events, mentor permissions, manual/classmate QA and operational acceptance
remain separate backlog items.

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

RELEASE-01 and QA-02 remain in progress. Manual screen-reader/contrast review,
three-classmate usability checks and physical-device testing are still open.
Email verification/password reset, mentor permissions, preview database
separation, account deletion and backup/restore operations remain on the
working checklist. The broader deployment checklist must be repeated for future
application releases; this record applies to the revision above.
