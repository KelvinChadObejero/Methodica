# History and reports (M5-02 / S4-02)

Account startup loads the library, templates and 25 recent sessions through
`GET /api/workspace/overview`. That session array is a cache, not the full history.
History requests 25 rows at a time from PostgreSQL; filters apply before paging.
The device adapter uses the same filter and report contracts locally.

## History contract

`GET /api/sessions/page` accepts `q` (up to 120 characters), `subject` (exact,
up to 60), `reflected=true|false`, `offset` (0–5000), `limit` (1–100, default 25),
and optional `revision`. It returns `{items,total,subjects,nextOffset,revision}`.
Search matches literal substrings of the historical flow title, subject or
reflection notes, ignoring case. Subjects include only the owner's records.
Order is `startedAt DESC, id DESC`; IDs break timestamp ties. A changed revision
returns 409 instead of silently mixing pages. Reload history starts at page one.
`GET /api/sessions/:id` loads one owner-scoped record for older reflections.

New timer saves include the ordered planned blocks captured at session start.
The API validates and stores those IDs, names, types, techniques and durations
as JSON on the session. Flow edits/deletion cannot change them. Older records
omit blocks and say the details were not recorded; they never borrow today's
flow blocks. These snapshots describe the plan. Execution/skip events remain
M4-02 work. Imports preserve valid snapshots and reject malformed ones.

## Calendar and export rules

`GET /api/reports/summary?days=7|30|90&timezone=<IANA zone>` returns aggregates,
the daily series, subject totals, `until`, `startDay` and a workspace `revision`.
The browser sends its current timezone and displays it. Calendar days include
today and the preceding 6, 29 or 89 days, ending at the captured server time.
The session's start date receives its measured study time. Future sessions are
excluded. Breaks, pauses and skips earn no time; partial study effort does count.
Legacy estimates have zero measured focus and earn no streak or completion.

A day is active when measured focus is greater than zero. The current streak
counts consecutive active calendar days ending today, or yesterday if today is
not yet active. The streak spans all saved history. DST uses the requested zone,
not a fixed 24-hour subtraction. SQL converts UTC timestamps explicitly before
grouping. The chart covers the selected range; longer ranges combine consecutive
days into at most seven bars, preserving every minute in the range.

`GET /api/reports/sessions` requires the summary's `days`, `timezone`, `until`
and `revision`, returning `{csv}` for exactly that membership. A changed workspace
returns 409 and asks the student to refresh the report. Device exports similarly
compare their saved snapshot. CSV quoting and spreadsheet-formula neutralization
are shared with Settings exports. Full workspace backups, compatibility session
lists and CSV responses stream after the database read succeeds; they do not
depend on Vercel's buffered response limit. Imports retain their 4 MB request cap.

## Storage compatibility and verification

The additive migration adds nullable session blocks, workspace revision and a
normalization timestamp. Fast history/report reads check only workspace metadata
before querying owner-scoped rows; they do not hydrate the full JSON mirror or
all reflection notes. Counts/items/revision share an account row lock. Older
writers invalidate the marker through a trigger, even in the same millisecond.
The next request checks and reconciles the compatibility mirror. Known optional
snapshots survive older serializers when the immutable session core matches.

Backend checks exercise 5,000 sessions, timestamp ties, pagination without
overlap, a 25-row overview, older-session reads, owner isolation, literal search,
stale revisions, flow deletion, old-writer reconciliation and DST boundaries.
SQL report totals are compared with the device algorithm and CSV membership.
Chromium covers an older-page reflection, server note search, a 30-day CSV and
375px chart layout, alongside the full two-block student journey.

Demo: open Session History, filter/search, use Next page and open an older
reflection; then Dashboard → Last 30 days → Export report. Accounts with fewer
than 26 sessions correctly disable Next page.
