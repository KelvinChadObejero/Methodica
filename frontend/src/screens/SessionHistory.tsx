import type { HistoryPage } from "../../../backend/src/history";
import { errorMessage } from "../lib/api";
import { useEffect, useState } from "react";
import { useWorkspace } from "../lib/useWorkspace";
import { navigate } from "../lib/navigation";
import { dayKey } from "../lib/analytics";
export default function SessionHistory() {
  const { data, getHistory } = useWorkspace();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [withReflection, setWithReflection] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState<HistoryPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      void getHistory({ q: query, subject, reflected: withReflection, offset, limit: 25, revision })
        .then((result) => {
          if (!cancelled) setPage(result);
        })
        .catch((cause) => {
          if (!cancelled) setError(errorMessage(cause));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [getHistory, data, query, subject, withReflection, offset, revision, retry]);
  function resetPage() {
    setOffset(0);
    setRevision(undefined);
    setExpanded(null);
  }
  const subjects = page?.subjects || [];
  const sessions = loading || error ? [] : page?.items || [];
  const groups = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const key = dayKey(new Date(session.startedAt));
    groups.set(key, [...(groups.get(key) || []), session]);
  }
  function reflect(id: string) {
    try {
      sessionStorage.setItem("methodica-reflection-session", id);
    } catch {
      /* The reflection screen still lists all sessions. */
    }
    navigate("reflect");
  }
  return (
    <section className="screen">
      <div className="eyebrow">A RECORD OF YOUR EFFORT</div>
      <div className="page-heading">
        <div>
          <h1 className="page-title">Every session adds up.</h1>
          <p className="page-sub">Your saved study time and reflections, together in one place.</p>
        </div>
        <button className="btn ghost" onClick={() => navigate("timer")}>
          New session →
        </button>
      </div>
      <div className="card history-toolbar">
        <label className="search-label">
          Search sessions
          <input
            className="search"
            value={query}
            maxLength={120}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="Search flows, subjects, or notes"
          />
        </label>
        <label>
          Subject
          <select
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              resetPage();
            }}
          >
            <option value="">All subjects</option>
            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={withReflection}
            onChange={(event) => {
              setWithReflection(event.target.checked);
              resetPage();
            }}
          />
          With reflection
        </label>
      </div>
      {loading && <p role="status">Loading sessions…</p>}
      {error && (
        <div className="card" role="alert">
          <p>{error}</p>
          <button
            className="btn ghost"
            onClick={() => {
              resetPage();
              setRetry((v) => v + 1);
            }}
          >
            Reload history
          </button>
        </div>
      )}
      {!loading && !error && !sessions.length && (
        <div className="card empty-state">
          <h2>{data?.sessions.length ? "No sessions match." : "Your story starts here."}</h2>
          <p>
            {data?.sessions.length
              ? "Try another subject or clear your filters."
              : "Finish a study session and your history will appear here."}
          </p>
          <button
            className="btn ghost"
            onClick={() => {
              if (data?.sessions.length) {
                resetPage();
                setQuery("");
                setSubject("");
                setWithReflection(false);
              } else navigate("timer");
            }}
          >
            {data?.sessions.length ? "Clear filters" : "Open study timer"}
          </button>
        </div>
      )}
      {!loading && !error && !!page?.total && (
        <p className="muted" role="status">
          Showing {offset + 1}–{offset + sessions.length} of {page.total} sessions
        </p>
      )}
      <div className="sessions-list">
        {Array.from(groups.entries()).map(([day, entries]) => (
          <div className="session-group" key={day}>
            <h2 className="session-group-label">
              {new Date(entries[0].startedAt).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h2>
            {entries.map((session) => (
              <article className="card session-card" key={session.id}>
                <div className="session-header">
                  <div className="session-main">
                    <span className="tag">{session.subject}</span>
                    <h3 className="session-title">{session.flowTitle}</h3>
                  </div>
                  <div className="session-meta">
                    <span className="session-time">
                      {new Date(session.startedAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="session-duration">
                      {session.durationMinutes.toFixed(1)} min
                    </span>
                  </div>
                </div>
                <div className="session-details">
                  <span>
                    {session.timingSource === "legacy-estimate"
                      ? "Imported legacy estimate"
                      : session.status === "completed"
                        ? "Completed in full"
                        : "Ended early / blocks skipped"}
                  </span>
                  <span>
                    {session.timingSource === "legacy-estimate"
                      ? "Measured study time unavailable"
                      : `${session.focusMinutes.toFixed(1)} min studying`}
                  </span>
                </div>
                {session.blocks ? (
                  <details className="snapshot-detail">
                    <summary>Flow at session start</summary>
                    <ol>
                      {session.blocks.map((block, index) => (
                        <li key={block.id}>
                          {block.title} · {block.type} · {block.durationMinutes} min planned
                          {session.execution && (
                            <div>
                              {session.execution.blocks[index].outcome.replace("-", " ")} ·{" "}
                              {(session.execution.blocks[index].elapsedMs / 1000).toFixed(1)}{" "}
                              seconds run
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : (
                  <p className="muted">Block details were not recorded for this older session.</p>
                )}
                {session.execution ? (
                  <details className="snapshot-detail">
                    <summary>Execution timeline</summary>
                    <ol>
                      {session.execution.events.map((event, index) => (
                        <li key={index}>
                          {(event.atMs / 1000).toFixed(1)} seconds: {event.type}{" "}
                          {session.blocks?.find((block) => block.id === event.blockId)?.title}
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : (
                  <p className="muted">
                    Execution events were not recorded for this older session.
                  </p>
                )}
                <div className="inline-actions">
                  {session.reflection && (
                    <button
                      className="btn ghost"
                      aria-expanded={expanded === session.id}
                      onClick={() => setExpanded(expanded === session.id ? null : session.id)}
                    >
                      {expanded === session.id ? "Hide reflection" : "View reflection"}
                    </button>
                  )}
                  <button className="text-button" onClick={() => reflect(session.id)}>
                    {session.reflection ? "Edit reflection" : "Add reflection →"}
                  </button>
                </div>
                {expanded === session.id && session.reflection && (
                  <div className="reflection-detail">
                    <div className="inline-actions">
                      <span>
                        Comprehension <b>{session.reflection.comprehension}/5</b>
                      </span>
                      <span>
                        Mental fatigue <b>{session.reflection.fatigue}/5</b>
                      </span>
                    </div>
                    <p>{session.reflection.notes || "No notes added."}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        ))}
      </div>
      {!loading && !error && page && (
        <nav className="inline-actions" aria-label="History pages">
          <button
            className="btn ghost"
            disabled={!offset}
            onClick={() => {
              setOffset(Math.max(0, offset - 25));
              setRevision(page.revision);
              setExpanded(null);
            }}
          >
            Previous page
          </button>
          <button
            className="btn ghost"
            disabled={page.nextOffset === null}
            onClick={() => {
              setOffset(page.nextOffset!);
              setRevision(page.revision);
              setExpanded(null);
            }}
          >
            Next page
          </button>
          {offset > 0 && (
            <button className="text-button" onClick={resetPage}>
              First page
            </button>
          )}
        </nav>
      )}
    </section>
  );
}
