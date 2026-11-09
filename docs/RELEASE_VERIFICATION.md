# Private workspace release — 2026-11-09

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
