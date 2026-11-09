import { useState, type FormEvent } from "react";
import { useWorkspace } from "../lib/useWorkspace";
import { errorMessage } from "../lib/api";
import { navigate } from "../lib/navigation";
import type { SessionLog } from "../types";
import {
  clearDraft,
  draftKey,
  isReflectionDraft,
  readDraft,
  writeDraft,
  type ReflectionDraft,
} from "../lib/drafts";
import { useUnsavedChanges } from "../lib/useUnsavedChanges";

function selectedSessionId() {
  try {
    return sessionStorage.getItem("methodica-reflection-session") || "";
  } catch {
    return "";
  }
}
function ReflectionForm({ session }: { session: SessionLog }) {
  const { saveReflection, mode, user } = useWorkspace();
  const storageKey = draftKey(
    mode === "device" ? "device" : `account-${user?.id}`,
    `reflection-${session.id}`
  );
  const [restored] = useState(() => readDraft(storageKey, isReflectionDraft));
  const [comprehension, setComprehension] = useState(
    restored?.comprehension ?? session.reflection?.comprehension ?? 3
  );
  const [fatigue, setFatigue] = useState(restored?.fatigue ?? session.reflection?.fatigue ?? 3);
  const [notes, setNotes] = useState(restored?.notes ?? session.reflection?.notes ?? "");
  const [dirty, setDirty] = useState(!!restored);
  const [draftError, setDraftError] = useState("");
  useUnsavedChanges(dirty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  function update(change: Partial<ReflectionDraft>) {
    const next = { comprehension, fatigue, notes, ...change };
    setComprehension(next.comprehension);
    setFatigue(next.fatigue);
    setNotes(next.notes);
    setDirty(true);
    setDraftError(
      writeDraft(storageKey, next)
        ? ""
        : "This browser cannot keep a recovery draft. Keep this page open until your reflection saves."
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSubmitted(false);
    try {
      await saveReflection(session.id, { comprehension, fatigue, notes });
      setSubmitted(true);
      setDirty(false);
      clearDraft(storageKey);
      setDraftError("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card reflect-card" onSubmit={(event) => void submit(event)}>
      <h2>{session.flowTitle}</h2>
      <p className="sub">
        {session.subject} · {new Date(session.startedAt).toLocaleString()} ·{" "}
        {session.durationMinutes.toFixed(1)} min
      </p>
      {restored && dirty && (
        <p className="feedback">
          Your unsaved reflection was restored from this tab. Save it to update your session.
        </p>
      )}
      <fieldset disabled={busy} onChange={() => setSubmitted(false)}>
        <div className="slider-block">
          <label className="top" htmlFor="comprehension">
            <b>Comprehension</b>
            <span className="val">{comprehension}/5</span>
          </label>
          <input
            id="comprehension"
            type="range"
            min={1}
            max={5}
            value={comprehension}
            onChange={(event) => update({ comprehension: Number(event.target.value) })}
          />
          <div className="scale-labels">
            <span>Foggy</span>
            <span>Crystal clear</span>
          </div>
        </div>
        <div className="slider-block">
          <label className="top" htmlFor="fatigue">
            <b>Mental fatigue</b>
            <span className="val">{fatigue}/5</span>
          </label>
          <input
            id="fatigue"
            type="range"
            min={1}
            max={5}
            value={fatigue}
            onChange={(event) => update({ fatigue: Number(event.target.value) })}
          />
          <div className="scale-labels">
            <span>Fresh</span>
            <span>Drained</span>
          </div>
        </div>
        <label>
          What worked? What would you change?
          <textarea
            maxLength={5000}
            placeholder="Optional notes for your next session…"
            value={notes}
            onChange={(event) => update({ notes: event.target.value })}
          />
        </label>
        <button className="btn full-width" type="submit">
          {busy ? "Saving…" : session.hasReflection ? "Update reflection" : "Save reflection"}
        </button>
      </fieldset>
      {error && (
        <p className="feedback" role="alert">
          {error}
        </p>
      )}
      {draftError && (
        <p className="feedback" role="alert">
          {draftError}
        </p>
      )}
      {submitted && (
        <p className="feedback" role="status">
          Reflection saved to this session.{" "}
          <button type="button" className="text-button" onClick={() => navigate("history")}>
            View history →
          </button>
        </p>
      )}
    </form>
  );
}

export default function Reflection() {
  const { data } = useWorkspace();
  const [selectedId, setSelectedId] = useState(selectedSessionId);
  const sessions = [...(data?.sessions || [])].sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)
  );
  const session =
    sessions.find((item) => item.id === selectedId) ||
    sessions.find((item) => !item.hasReflection) ||
    sessions[0];
  return (
    <section className="screen">
      <div className="eyebrow">PAUSE. NOTICE. ADJUST.</div>
      <h1 className="page-title">A moment to reflect.</h1>
      <p className="page-sub">
        Notice what helped you understand, and what took your energy. Carry that into your next
        session.
      </p>
      {!session ? (
        <div className="card empty-state">
          <h2>Something to reflect on, soon.</h2>
          <p>Run a study flow first. Your saved session will appear here.</p>
          <button className="btn" onClick={() => navigate("timer")}>
            Start a session
          </button>
        </div>
      ) : (
        <>
          <label className="session-picker">
            Choose a session
            <select value={session.id} onChange={(event) => setSelectedId(event.target.value)}>
              {sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.flowTitle} · {new Date(item.startedAt).toLocaleString()}
                  {item.hasReflection ? " · Reflected" : ""}
                </option>
              ))}
            </select>
          </label>
          <ReflectionForm key={session.id} session={session} />
        </>
      )}
    </section>
  );
}
