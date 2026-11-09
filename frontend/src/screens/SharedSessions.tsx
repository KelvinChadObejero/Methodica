import { useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { useWorkspace } from "../lib/useWorkspace";
import { navigate } from "../lib/navigation";
import type {
  SharingProfile,
  SharedSessionPage,
  SharedSessionDetail,
} from "../../../backend/src/share-types";

function AccountSharedSessions() {
  const [profile, setProfile] = useState<SharingProfile | null>(null);
  const [page, setPage] = useState<SharedSessionPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [detail, setDetail] = useState<SharedSessionDetail | null>(null);
  const [selected, setSelected] = useState("");
  const [detailError, setDetailError] = useState("");
  const [opening, setOpening] = useState(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    []
  );
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setDetail(null);
    setSelected("");
    setDetailError("");
    setOpening(false);
    generation.current++;
    void Promise.all([
      api<SharingProfile>("/sharing/profile"),
      api<SharedSessionPage>(`/shared-sessions?offset=${offset}`),
    ])
      .then(([user, list]) => {
        if (!cancelled) {
          setProfile(user);
          setPage(list);
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offset, retry]);
  async function open(id: string) {
    const request = ++generation.current;
    setSelected(id);
    setDetail(null);
    setDetailError("");
    setOpening(true);
    try {
      const result = await api<SharedSessionDetail>(`/shared-sessions/${encodeURIComponent(id)}`);
      if (request === generation.current) setDetail(result);
    } catch (cause) {
      if (request === generation.current) setDetailError(errorMessage(cause));
    } finally {
      if (request === generation.current) setOpening(false);
    }
  }
  async function copy() {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.code);
      setCopyFeedback("Account code copied.");
    } catch {
      setCopyFeedback("Copy the account code from the field above.");
    }
  }
  return (
    <section className="screen">
      <div className="eyebrow">A SESSION, SHARED WITH PURPOSE</div>
      <h1 className="page-title">Sessions shared with you.</h1>
      <p className="page-sub">
        Read only the sessions a student chooses to share. Your account does not receive access to
        their library or other sessions.
      </p>
      {profile && (
        <div className="card editor-panel">
          <h2>Your account code</h2>
          <p className="muted">
            Give this code to a student who wants to share a selected session with you. They will
            confirm your named account before sharing.
          </p>
          <label>
            My account code
            <input readOnly value={profile.code} onFocus={(event) => event.target.select()} />
          </label>
          <button className="btn ghost" onClick={() => void copy()}>
            Copy account code
          </button>
          {copyFeedback && <p role="status">{copyFeedback}</p>}
        </div>
      )}
      <div className="inline-actions section">
        <button
          className="btn ghost"
          onClick={() => {
            setOffset(0);
            setRetry((value) => value + 1);
          }}
        >
          Refresh shared list
        </button>
      </div>
      {loading && <p role="status">Loading shared sessions...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && page && (
        <>
          <p className="muted">{page.total} sessions shared with you</p>
          {!page.items.length && (
            <div className="card empty-state">
              <h2>No sessions shared yet.</h2>
              <p>Only explicit shares addressed to your account appear here.</p>
            </div>
          )}
          <div className="sessions-list">
            {page.items.map((item) => (
              <article className="card session-card" key={item.id}>
                <span className="tag">{item.subject}</span>
                <h2>{item.title}</h2>
                <p>
                  Shared by {item.ownerName} · {new Date(item.startedAt).toLocaleString()}
                </p>
                <p className="muted">
                  Read only ·{" "}
                  {item.timingSource === "legacy-estimate"
                    ? "Imported estimate"
                    : `${item.focusMinutes.toFixed(1)} min studying`}
                </p>
                <button className="btn ghost" onClick={() => void open(item.id)}>
                  View shared session
                </button>
              </article>
            ))}
          </div>
          <nav className="inline-actions" aria-label="Shared session pages">
            <button
              className="btn ghost"
              disabled={!offset}
              onClick={() => setOffset(Math.max(0, offset - 25))}
            >
              Previous shared page
            </button>
            <button
              className="btn ghost"
              disabled={page.nextOffset === null}
              onClick={() => setOffset(page.nextOffset!)}
            >
              Next shared page
            </button>
          </nav>
        </>
      )}
      {opening && <p role="status">Opening the shared session...</p>}
      {detailError && <p role="alert">{detailError}</p>}
      {selected && (
        <button
          className="text-button section"
          disabled={opening}
          onClick={() => void open(selected)}
        >
          Refresh shared session
        </button>
      )}
      {detail && (
        <article className="card editor-panel shared-detail" aria-label="Read-only shared session">
          <span className="tag">Read only</span>
          <h2>{detail.session.flowTitle}</h2>
          <p>Shared by {detail.ownerName}</p>
          <p>
            {detail.session.subject} · {new Date(detail.session.startedAt).toLocaleString()} ·{" "}
            {detail.session.durationMinutes.toFixed(1)} min elapsed
          </p>
          <p>
            {detail.session.timingSource === "legacy-estimate"
              ? "Imported legacy estimate. Measured study time unavailable."
              : `${detail.session.focusMinutes.toFixed(1)} min studying · ${detail.session.status}`}
          </p>
          {detail.session.blocks && (
            <details>
              <summary>Shared block details</summary>
              <ol>
                {detail.session.blocks.map((block, index) => (
                  <li key={block.id}>
                    {block.title} · {block.durationMinutes} min planned
                    {detail.session.execution &&
                      ` · ${detail.session.execution.blocks[index].outcome} · ${(detail.session.execution.blocks[index].elapsedMs / 1000).toFixed(1)} seconds run`}
                  </li>
                ))}
              </ol>
            </details>
          )}
          {detail.includeReflection ? (
            detail.session.reflection ? (
              <div className="reflection-detail">
                <h3>Shared reflection</h3>
                <p>
                  Comprehension {detail.session.reflection.comprehension}/5 · Mental fatigue{" "}
                  {detail.session.reflection.fatigue}/5
                </p>
                <p>{detail.session.reflection.notes || "No reflection notes added."}</p>
              </div>
            ) : (
              <p>No reflection has been saved.</p>
            )
          ) : (
            <p>Reflection notes and ratings are not shared.</p>
          )}
        </article>
      )}
    </section>
  );
}
export default function SharedSessions() {
  const { user, mode } = useWorkspace();
  if (!user || mode !== "server")
    return (
      <section className="screen card editor-panel">
        <h1 className="page-title">Shared sessions use your account.</h1>
        <p>
          Open your account workspace to receive selected sessions. Device work stays in this
          browser.
        </p>
        <button className="btn" onClick={() => navigate(user ? "sync" : "login")}>
          Open account workspace
        </button>
      </section>
    );
  return <AccountSharedSessions key={user.id} />;
}
