import { useEffect, useId, useState, type FormEvent } from "react";
import { api, errorMessage } from "../lib/api";
import type { SessionGrant, SharingProfile } from "../../../backend/src/share-types";

function GrantAccess({
  grant,
  busy,
  onUpdate,
  onRevoke,
}: {
  grant: SessionGrant;
  busy: boolean;
  onUpdate: (include: boolean) => void;
  onRevoke: () => void;
}) {
  const [include, setInclude] = useState(grant.includeReflection);
  return (
    <div className="sharing-grant">
      <p>
        <b>{grant.recipient.name}</b> · code ending {grant.recipient.code.slice(-6)}
      </p>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={include}
          disabled={busy}
          onChange={(e) => setInclude(e.target.checked)}
        />
        Include reflection for {grant.recipient.name}
      </label>
      <div className="inline-actions">
        <button
          className="btn ghost"
          disabled={busy || include === grant.includeReflection}
          onClick={() => onUpdate(include)}
        >
          Update access
        </button>
        <button
          className="text-button"
          disabled={busy}
          onClick={onRevoke}
          aria-label={`Revoke ${grant.recipient.name}'s access`}
        >
          Revoke access
        </button>
      </div>
    </div>
  );
}

export default function SessionSharing({ sessionId }: { sessionId: string }) {
  const label = useId();
  const [grants, setGrants] = useState<SessionGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [retry, setRetry] = useState(0);
  const [code, setCode] = useState("");
  const [recipient, setRecipient] = useState<SharingProfile | null>(null);
  const [include, setInclude] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const path = `/sessions/${encodeURIComponent(sessionId)}/shares`;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void api<SessionGrant[]>(path)
      .then((data) => {
        if (!cancelled) setGrants(data);
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
  }, [path, retry]);
  async function lookup(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFeedback("");
    setRecipient(null);
    setConfirmed(false);
    setInclude(false);
    try {
      setRecipient(
        await api<SharingProfile>(
          `/sharing/recipient?${new URLSearchParams({ code: code.trim() })}`
        )
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    if (!recipient || !confirmed) return;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const saved = await api<SessionGrant>(path, "POST", {
        recipientCode: recipient.code,
        includeReflection: include,
      });
      setGrants((current) => [...current.filter((item) => item.id !== saved.id), saved]);
      setRecipient(null);
      setCode("");
      setConfirmed(false);
      setInclude(false);
      setFeedback(`This session is shared read-only with ${saved.recipient.name}.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function update(grant: SessionGrant, includeReflection: boolean) {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const saved = await api<SessionGrant>(`${path}/${encodeURIComponent(grant.id)}`, "PUT", {
        includeReflection,
      });
      setGrants((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setFeedback("Sharing permissions updated.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function revoke(grant: SessionGrant) {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await api(`${path}/${encodeURIComponent(grant.id)}`, "DELETE");
      setGrants((current) => current.filter((item) => item.id !== grant.id));
      setFeedback(`Access revoked for ${grant.recipient.name}.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="sharing-panel" aria-labelledby={label}>
      <h4 id={label}>Share only this session.</h4>
      <p className="muted">
        Your mentor can read this session. Your library and other sessions stay private. Revoke
        stops future access; it cannot remove copies already made.
      </p>
      {loading ? (
        <p role="status">Loading sharing permissions...</p>
      ) : (
        <>
          <form onSubmit={(event) => void lookup(event)}>
            <label>
              Mentor account code
              <input
                value={code}
                maxLength={84}
                required
                disabled={busy}
                onChange={(event) => {
                  setCode(event.target.value);
                  setRecipient(null);
                  setConfirmed(false);
                }}
                placeholder="Ask your mentor for their Methodica code"
              />
            </label>
            <button className="btn ghost" disabled={busy}>
              Find account
            </button>
          </form>
          {recipient && (
            <div className="sharing-review">
              <p>
                Named account: <b>{recipient.name}</b> · code ending {recipient.code.slice(-6)}
              </p>
              <p className="muted">Confirm this is the account your mentor gave you.</p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={include}
                  disabled={busy}
                  onChange={(event) => setInclude(event.target.checked)}
                />
                Include reflection notes and ratings, including later updates
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                Share only this session with {recipient.name}
              </label>
              <button className="btn" disabled={busy || !confirmed} onClick={() => void share()}>
                Confirm read-only sharing
              </button>
            </div>
          )}
          <p className="muted">
            Reflection content stays private unless you include it. Including it shares current
            notes, ratings and later updates. Account codes identify existing accounts; no email or
            invitation is sent.
          </p>
          {grants.length ? (
            <div aria-label="People with access">
              {grants.map((grant) => (
                <GrantAccess
                  key={`${grant.id}-${grant.includeReflection}`}
                  grant={grant}
                  busy={busy}
                  onUpdate={(include) => void update(grant, include)}
                  onRevoke={() => void revoke(grant)}
                />
              ))}
            </div>
          ) : (
            <p>No one else has access to this session.</p>
          )}
        </>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => setRetry((value) => value + 1)}
          >
            Refresh permissions
          </button>
        </p>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </section>
  );
}
