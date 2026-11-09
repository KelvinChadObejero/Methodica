# Timer execution (M4-02)

New runs retain an immutable planned flow and a versioned execution record.
Each planned block has an elapsed millisecond total and an outcome: completed,
skipped, stopped, or not started. The live runner also uses a running outcome;
the API rejects it on a finished session. Ordered start/completion/skip/stop
events use offsets in total running milliseconds, excluding pauses. Break time
is included in elapsed time and excluded from measured study time.

The API checks block identity/order, per-block limits, terminal order, exact
event offsets and consistency with whole-second session totals. A completed
session must complete every block. JSON backups and CSV exports preserve the
execution record; history shows per-block times and the event timeline. Older
sessions and already-active older timers omit missing events rather than
inventing them. An additive nullable JSON column preserves deployed writers.
The compatibility adapter retains known optional execution fields omitted by
an older serializer when the immutable session core matches.

## Timing and reopening

The runner uses `performance.timeOrigin + performance.now()` for deadlines,
which avoids changing elapsed time when `Date.now()` or the system clock jumps.
See the [High Resolution Time specification](https://www.w3.org/TR/hr-time-2/)
and [browser time-origin documentation](https://developer.mozilla.org/en-US/docs/Web/API/Performance/timeOrigin).
Delayed callbacks catch up across block boundaries once. Focus updates the
display immediately. Background time counts while the page remains running.

Refresh/reopening recovers the most recent checkpoint **paused**. Resume is
explicit. Time while the page was closed or reloading is not credited; at most
one checkpoint interval (250 ms) before closure is absent. This also avoids
using a wall-clock jump during closure as study time. A completed failed save
keeps its exact payload and stable ID. Recovery checks whether that ID already
saved before allowing another run or retry. A committed success whose response
was lost is safe to retry, without creating another session or losing notes.

This measures a running timer, not attention or an unforgeable activity log.
Browser/OS suspension behavior can vary; there is no claim that a powered-off
device continues measuring engagement. The API retains its elapsed-time bounds.

## Duplicate tabs and alerts

An exclusive [Web Lock](https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request)
reserves timer control per account (or the shared device workspace) within a
browser profile. A visible idle timer or unsaved run holds it, including when a
running timer is hidden behind another screen. The other tab can browse but
cannot start, resume, skip, reset or save that timer. Once the owner closes or
leaves an idle/saved timer, the waiting tab acquires control automatically. A copied run
recovers paused and checks for an already-saved session. Browsers without Web
Locks explain the limitation and do not start an uncoordinated timer. This does
not lock independent browser profiles or devices.

Block transitions and completion show an in-page status message. Desktop
notifications are attempted only when the student enabled them and permission
is already granted. A notification failure falls back to the in-page message.
No notification permission is requested automatically.

## Verification and demo

Unit checks cover delayed multi-block callbacks, pause/resume, manual breaks,
skip/stop outcomes, immutable event records, total validation, reopening and
system-clock jumps. The browser journey uses two real one-minute blocks,
refreshes/resumes, opens a duplicated tab, shifts `Date.now()` without speeding
up the timer, exercises real permitted Notification construction, and retries
a success response lost after the database commit. A device journey closes the
owning tab, acquires control in its duplicate, resumes and saves one partial
session with the original ID. Account tests verify private persisted events.

Demo: run two short blocks; refresh and Resume; duplicate the tab to show its
control message; complete or skip/finish; open History → Flow at session start
and Execution timeline. Unrun blocks receive no time.
