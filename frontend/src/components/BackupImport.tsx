import { useState, type ChangeEvent } from "react";
import { useWorkspace } from "../lib/useWorkspace";
import { errorMessage } from "../lib/api";
import { navigate } from "../lib/navigation";
import { LEGACY_SESSIONS_KEY, parseBackup, type BackupSource } from "../lib/backup-import";
import {
  hasImportAdditions,
  MAX_IMPORT_BYTES,
  reviewWorkspaceImport,
  type ImportReview,
  type ImportSummary,
} from "../../../backend/src/workspace-import";

export default function BackupImport() {
  const { mode, user, loading, getWorkspace, importDeviceWorkspace } = useWorkspace();
  const [source, setSource] = useState<
    (BackupSource & { label: string; browserRaw?: string }) | null
  >(null);
  const [review, setReview] = useState<ImportReview | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function resetReview() {
    setReview(null);
    setResult(null);
    setConfirmed(false);
    setError("");
  }
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    resetReview();
    setSource(null);
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > MAX_IMPORT_BYTES - 1024)
        throw new Error("Choose a JSON backup smaller than 8 MB.");
      setSource({ ...(await parseBackup(await file.text())), label: file.name });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function loadLegacy() {
    resetReview();
    setSource(null);
    setBusy(true);
    try {
      const raw = localStorage.getItem(LEGACY_SESSIONS_KEY);
      if (raw === null) throw new Error("No older Methodica sessions were found in this browser.");
      const parsed = await parseBackup(raw);
      if (!parsed.legacy)
        throw new Error("This older browser record is not a supported session list.");
      setSource({ ...parsed, label: "Older sessions in this browser", browserRaw: raw });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function prepare() {
    if (!source || !user || mode !== "server") return;
    resetReview();
    setBusy(true);
    try {
      const target = await getWorkspace();
      setReview(await reviewWorkspaceImport(target, source.workspace, user.id));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!source || !review || !confirmed || !user) return;
    setBusy(true);
    setError("");
    try {
      if (
        source.browserRaw !== undefined &&
        localStorage.getItem(LEGACY_SESSIONS_KEY) !== source.browserRaw
      )
        throw new Error(
          "Older browser sessions changed. Read and review them again; nothing was copied."
        );
      const summary = await importDeviceWorkspace(review.source, review.token);
      setResult(summary);
      setReview(null);
      setConfirmed(false);
    } catch (cause) {
      setError(errorMessage(cause));
      setReview(null);
      setConfirmed(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card editor-panel device-import" aria-labelledby="backup-import-title">
      <div className="eyebrow">RESTORE YOUR SAVED WORK</div>
      <h2 id="backup-import-title">Import a backup or older sessions.</h2>
      <p className="muted">
        Choose a Methodica JSON export or read older sessions saved in this browser. Review happens
        here before anything is copied to your named account. Existing account records and the
        original backup stay intact.
      </p>
      <label>
        Methodica JSON backup
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => void chooseFile(event)}
        />
      </label>
      <button type="button" className="btn ghost" disabled={busy} onClick={() => void loadLegacy()}>
        Read older browser sessions
      </button>
      {busy && <p role="status">Preparing your import…</p>}
      {error && (
        <p className="feedback" role="alert">
          {error}
        </p>
      )}
      {source && (
        <>
          <h3>{source.label}</h3>
          <p>
            {source.workspace.flows.length} flows · {source.workspace.sessions.length} sessions ·{" "}
            {source.workspace.templates.length} private templates
          </p>
          {source.legacy && (
            <p className="feedback">
              The old timer saved planned durations, including some early finishes. These records
              retain that estimate and any reflection. They add no measured study minutes,
              completed-session credit, or streak days.
            </p>
          )}
          {!user ? (
            <button className="btn ghost" onClick={() => navigate("login")}>
              Log in to review this backup
            </button>
          ) : mode !== "server" ? (
            <p>Open your account workspace above to review this import.</p>
          ) : (
            <>
              <p>
                Destination account: <strong>{user.email}</strong>
              </p>
              {!review && (
                <button
                  className="btn ghost"
                  disabled={busy || loading}
                  onClick={() => void prepare()}
                >
                  {result ? "Review backup again" : "Review backup"}
                </button>
              )}
              {review && (
                <div className="import-review">
                  <h3>What will be copied</h3>
                  <p>
                    {review.added.flows} flows · {review.added.sessions} sessions ·{" "}
                    {review.reflections} reflections · {review.added.templates} private templates
                  </p>
                  <p className="muted">
                    Already present: {review.existing.flows} flows, {review.existing.sessions}{" "}
                    sessions and {review.existing.templates} templates. Matching IDs are not added
                    twice.
                  </p>
                  <details>
                    <summary>Review record names</summary>
                    <ul>
                      {review.source.flows.map((flow) => (
                        <li key={`flow-${flow.id}`}>Flow: {flow.title}</li>
                      ))}
                      {review.source.sessions.slice(0, 20).map((session) => (
                        <li key={`session-${session.id}`}>
                          Session: {session.flowTitle} ·{" "}
                          {new Date(session.startedAt).toLocaleString()}
                          {session.hasReflection ? " · Includes reflection notes" : ""}
                        </li>
                      ))}
                      {review.source.sessions.length > 20 && (
                        <li>And {review.source.sessions.length - 20} more sessions.</li>
                      )}
                      {review.source.templates.map((template) => (
                        <li key={`template-${template.id}`}>Private template: {template.title}</li>
                      ))}
                    </ul>
                  </details>
                  {!!review.conflicts.length && (
                    <details>
                      <summary>
                        {review.conflicts.length} different versions will keep the account copy
                      </summary>
                      <ul>
                        {review.conflicts.map((conflict, index) => (
                          <li key={index}>{conflict.title}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {hasImportAdditions(review) ? (
                    <>
                      <label className="import-confirm">
                        <input
                          type="checkbox"
                          checked={confirmed}
                          disabled={busy}
                          onChange={(event) => setConfirmed(event.target.checked)}
                        />
                        I want to copy these backup records, including reflection notes and private
                        templates, to {user.email}.
                      </label>
                      <div className="account-actions">
                        <button
                          className="btn"
                          disabled={busy || loading || !confirmed}
                          onClick={() => void commit()}
                        >
                          Copy backup to my account
                        </button>
                        <button
                          className="btn ghost"
                          disabled={busy}
                          onClick={() => {
                            setReview(null);
                            setConfirmed(false);
                          }}
                        >
                          Cancel backup review
                        </button>
                      </div>
                    </>
                  ) : (
                    <p>There is nothing new to copy. Your account has not been changed.</p>
                  )}
                </div>
              )}
            </>
          )}
          {result && (
            <p className="feedback" role="status">
              {result.added.flows} flows, {result.added.sessions} sessions and{" "}
              {result.added.templates} templates copied. Your account versions and original backup
              were preserved.
            </p>
          )}
        </>
      )}
      <p className="muted">
        Preferences and ongoing timers are not imported. JSON exports from Settings, version 1
        workspace backups, and original legacy session lists are supported. CSV is for reports and
        cannot restore a workspace.
      </p>
    </section>
  );
}
