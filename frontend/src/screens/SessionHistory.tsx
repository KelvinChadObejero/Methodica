import { useState } from "react";
import { useWorkspace } from "../lib/useWorkspace";
import { navigate } from "../lib/navigation";
import { dayKey } from "../lib/analytics";

export default function SessionHistory() {
  const { data } = useWorkspace();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [withReflection, setWithReflection] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const subjects = [...new Set(data?.sessions.map((session) => session.subject) || [])].sort();
  const sessions = [...(data?.sessions || [])]
    .filter(
      (session) =>
        (!subject || session.subject === subject) &&
        (!withReflection || session.hasReflection) &&
        `${session.flowTitle} ${session.subject} ${session.reflection?.notes || ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    )
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search flows, subjects, or notes"
          />
        </label>
        <label>
          Subject
          <select value={subject} onChange={(event) => setSubject(event.target.value)}>
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
            onChange={(event) => setWithReflection(event.target.checked)}
          />
          With reflection
        </label>
      </div>
      {!sessions.length && (
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
                    {session.status === "completed"
                      ? "Completed in full"
                      : "Ended early / blocks skipped"}
                  </span>
                  <span>{session.focusMinutes.toFixed(1)} min studying</span>
                </div>
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
    </section>
  );
}
