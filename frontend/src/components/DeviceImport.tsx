import { useEffect, useState } from "react";
import { useWorkspace } from "../lib/useWorkspace";
import { DeviceWorkspace, DEVICE_WORKSPACE_KEY } from "../lib/device-workspace";
import { errorMessage } from "../lib/api";
import { navigate } from "../lib/navigation";
import type { Workspace } from "../types";
import {
  canonical,
  hasImportAdditions,
  reviewWorkspaceImport,
  validateImportWorkspace,
  type ImportReview,
  type ImportSummary,
} from "../../../backend/src/workspace-import";

export default function DeviceImport() {
  const { mode, user, loading, getWorkspace, importDeviceWorkspace } = useWorkspace();
  const [source, setSource] = useState<Workspace | null>(null);
  const [review, setReview] = useState<ImportReview | null>(null);
  const [sourceSnapshot, setSourceSnapshot] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportSummary | null>(null);

  useEffect(() => {
    const read = () => {
      setReview(null);
      setConfirmed(false);
      setResult(null);
      try {
        setSource(
          localStorage.getItem(DEVICE_WORKSPACE_KEY) === null
            ? null
            : validateImportWorkspace(new DeviceWorkspace(localStorage).read().workspace)
        );
        setError("");
      } catch (cause) {
        setSource(null);
        setError(errorMessage(cause));
      }
    };
    read();
    const changed = (event: StorageEvent) => {
      if (event.key === DEVICE_WORKSPACE_KEY) read();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [mode, user?.id]);

  async function prepare() {
    setBusy(true);
    setError("");
    setReview(null);
    setResult(null);
    setConfirmed(false);
    try {
      if (!user || mode !== "server")
        throw new Error("Open your account workspace before reviewing.");
      const device = new DeviceWorkspace(localStorage).read().workspace;
      // Only the account is fetched; no browser records upload during review.
      const target = await getWorkspace();
      const prepared = await reviewWorkspaceImport(target, device, user.id);
      setSource(device);
      setSourceSnapshot(canonical(device));
      setReview(prepared);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!review || !confirmed || !user) return;
    setBusy(true);
    setError("");
    try {
      if (canonical(new DeviceWorkspace(localStorage).read().workspace) !== sourceSnapshot)
        throw new Error("Your device data changed. Review the import again; nothing was copied.");
      const saved = await importDeviceWorkspace(review.source, review.token);
      setResult(saved);
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
    <section className="card editor-panel device-import" aria-labelledby="device-import-title">
      <div className="eyebrow">BRING YOUR PROGRESS WITH YOU</div>
      <h2 id="device-import-title">Copy this device’s study data to your account.</h2>
      <p className="muted">
        Review your flows, session history, reflections, and private templates before copying. Your
        browser copy stays here. Existing account records are kept.
      </p>
      {error && (
        <p className="feedback" role="alert">
          {error}
        </p>
      )}
      {!source && !error && <p>No study workspace is saved in this browser yet.</p>}
      {source && (
        <>
          <p className="muted">
            On this device: {source.flows.length} flows · {source.sessions.length} sessions ·{" "}
            {source.sessions.filter((session) => session.hasReflection).length} reflections ·{" "}
            {source.templates.length} private templates
          </p>
          {!user ? (
            <button className="btn ghost" onClick={() => navigate("login")}>
              Log in to review an import
            </button>
          ) : mode !== "server" ? (
            <p>
              Open your account workspace above to review the copy into{" "}
              <strong>{user.email}</strong>.
            </p>
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
                  {busy ? "Reviewing…" : result ? "Review again" : "Review device data"}
                </button>
              )}
              {review && (
                <div className="import-review">
                  <h3>What will be copied</h3>
                  <dl className="import-counts">
                    <div>
                      <dt>Flows</dt>
                      <dd>{review.added.flows}</dd>
                    </div>
                    <div>
                      <dt>Sessions</dt>
                      <dd>{review.added.sessions}</dd>
                    </div>
                    <div>
                      <dt>Reflections</dt>
                      <dd>{review.reflections}</dd>
                    </div>
                    <div>
                      <dt>Private templates</dt>
                      <dd>{review.added.templates}</dd>
                    </div>
                  </dl>
                  <p className="muted">
                    Already in this account: {review.existing.flows} flows,{" "}
                    {review.existing.sessions} sessions, and {review.existing.templates} templates.
                    These will not be added twice.
                  </p>
                  <details>
                    <summary>See the device records included in this review</summary>
                    <ul>
                      {review.source.flows.map((flow) => (
                        <li key={`flow-${flow.id}`}>Flow: {flow.title}</li>
                      ))}
                      {review.source.sessions.slice(0, 10).map((session) => (
                        <li key={`session-${session.id}`}>
                          Session: {session.flowTitle} ·{" "}
                          {new Date(session.startedAt).toLocaleString()}
                          {session.hasReflection ? " · Includes reflection notes" : ""}
                        </li>
                      ))}
                      {review.source.sessions.length > 10 && (
                        <li>And {review.source.sessions.length - 10} more sessions.</li>
                      )}
                      {review.source.templates.map((template) => (
                        <li key={`template-${template.id}`}>Private template: {template.title}</li>
                      ))}
                    </ul>
                  </details>
                  {review.conflicts.length > 0 && (
                    <details>
                      <summary>
                        {review.conflicts.length} different versions will keep the account copy
                      </summary>
                      <p>
                        The browser versions stay on this device. Nothing in the account will be
                        overwritten.
                      </p>
                      <ul>
                        {review.conflicts.map((conflict, index) => (
                          <li key={`${conflict.kind}-${index}`}>
                            {conflict.kind === "sessions"
                              ? "Session"
                              : conflict.kind === "flows"
                                ? "Flow"
                                : "Template"}
                            : {conflict.title}
                          </li>
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
                        I want to copy these records, including reflection notes and private
                        templates, to {user.email}.
                      </label>
                      <div className="account-actions">
                        <button
                          className="btn"
                          disabled={!confirmed || busy || loading}
                          onClick={() => void commit()}
                        >
                          {busy ? "Copying…" : "Copy to my account"}
                        </button>
                        <button
                          className="btn ghost"
                          disabled={busy}
                          onClick={() => {
                            setReview(null);
                            setConfirmed(false);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>There is nothing new to copy. Your account has not been changed.</p>
                      <button className="btn ghost" onClick={() => setReview(null)}>
                        Close review
                      </button>
                    </>
                  )}
                </div>
              )}
              {result && (
                <p className="feedback" role="status">
                  {result.added.flows} flows, {result.added.sessions} sessions ({result.reflections}{" "}
                  reflections), and {result.added.templates} private templates copied. Existing
                  account records and your browser copy were kept.
                </p>
              )}
            </>
          )}
        </>
      )}
      <p className="muted">
        This copies the current browser workspace. Exported backup files and older app storage are
        not imported here. Ongoing timers stay on this device. Export a backup from Settings before
        clearing browser data.
      </p>
    </section>
  );
}
