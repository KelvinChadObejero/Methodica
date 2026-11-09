import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "../lib/useWorkspace";
import { ApiError, errorMessage } from "../lib/api";
import { navigate } from "../lib/navigation";
import { loadPrefs } from "../lib/preferences";
import {
  finishRun,
  newRun,
  restoreRun,
  skipBlock,
  tick,
  toggleRun,
  timerNow,
  type TimerRun,
} from "../lib/timer";
import { useTimerLease } from "../lib/useTimerLease";
import type { SessionLog } from "../types";

function timeLabel(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function Timer({ active }: { active: boolean }) {
  const { data, studyTypes, mode, user, saveSession, getSession } = useWorkspace();
  const storageKey =
    mode === "device" ? "methodica-device-active-timer" : `methodica-account-timer-${user?.id}`;
  const [run, setRun] = useState<TimerRun | null>(
    () => restoreRun(storageKey) || (data?.flows[0] ? newRun(data.flows[0]) : null)
  );
  const [prefs, setPrefs] = useState(loadPrefs);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<SessionLog | null>(null);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const saving = useRef(false);
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState("");
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [transition, setTransition] = useState("");
  const previousBlock = useRef({ id: run?.id, index: run?.blockIndex, completed: run?.completed });
  const lease = useTimerLease(
    `methodica-timer-${mode}-${mode === "device" ? "device" : user?.id}`,
    active || (!!run?.startedAt && !saved)
  );
  const runId = run?.id;
  const hasStarted = !!run?.startedAt;
  const retryLease = lease.retry;
  useEffect(() => {
    let cancelled = false;
    setVerifiedId(null);
    setVerificationError("");
    if (lease.status !== "owned" || !runId) return;
    if (!hasStarted) {
      setVerifiedId(runId);
      return;
    }
    void getSession(runId)
      .then((existing) => {
        if (cancelled) return;
        setSaved(existing);
        setTransition("This run was already saved. Your saved session is available below.");
        setRun((current) =>
          current?.id === runId ? { ...current, completed: true, deadline: null } : current
        );
        setVerifiedId(runId);
      })
      .catch((cause) => {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 404) setVerifiedId(runId);
        else setVerificationError(errorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [lease.status, runId, hasStarted, getSession, verificationAttempt]);
  const canControl = lease.status === "owned" && verifiedId === run?.id && !verificationError;

  useEffect(() => {
    if (!run && data?.flows[0]) setRun(newRun(data.flows[0]));
  }, [run, data?.flows]);

  useEffect(() => {
    const refresh = () => setPrefs(loadPrefs());
    window.addEventListener("methodica-preferences", refresh);
    return () => window.removeEventListener("methodica-preferences", refresh);
  }, []);

  useEffect(() => {
    if (!run?.deadline || !canControl) return;
    const update = () =>
      setRun((current) => (current ? tick(current, timerNow(), prefs.autoStartBreaks) : null));
    update();
    const interval = window.setInterval(update, 250);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
    };
  }, [run?.deadline, prefs.autoStartBreaks, canControl]);

  useEffect(() => {
    try {
      if (saved) sessionStorage.removeItem(storageKey);
      else if (run?.startedAt) sessionStorage.setItem(storageKey, JSON.stringify(run));
      else sessionStorage.removeItem(storageKey);
    } catch {
      setStorageError(
        "This browser cannot retain the timer on refresh. Keep this tab open until your session is saved."
      );
    }
  }, [run, storageKey, saved]);

  useEffect(() => {
    const reopen = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setRun((current) =>
        current?.startedAt && !current.completed
          ? { ...current, deadline: null, recovered: true }
          : current
      );
      retryLease();
    };
    window.addEventListener("pageshow", reopen);
    return () => window.removeEventListener("pageshow", reopen);
  }, [retryLease]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (run?.startedAt && !saved) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [run?.startedAt, saved]);

  useEffect(() => {
    const previous = previousBlock.current;
    if (
      !saved &&
      run?.startedAt &&
      previous.id === run.id &&
      (previous.index !== run.blockIndex || (!previous.completed && run.completed))
    ) {
      const message = run.completed
        ? "Session ended. Your study time is ready to save."
        : `Next block: ${run.flow.blocks[run.blockIndex].title}`;
      setTransition(message);
      if (
        prefs.notifications &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("Methodica: study timer", { body: message });
        } catch {
          setTransition(`${message} Desktop notifications are unavailable in this browser.`);
        }
      }
    }
    previousBlock.current = { id: run?.id, index: run?.blockIndex, completed: run?.completed };
  }, [run, prefs.notifications, saved]);

  const save = useCallback(
    async (completed: TimerRun) => {
      if (saving.current || !canControl) return;
      saving.current = true;
      setBusy(true);
      setError("");
      const durationMinutes = Math.floor(completed.elapsedMs / 1000) / 60;
      try {
        if (durationMinutes < 1 / 60 || !completed.startedAt)
          throw new Error("Study for at least one second before saving a session.");
        const result = await saveSession({
          id: completed.id,
          flowId: completed.flow.id,
          flowTitle: completed.flow.title,
          flowTag: completed.flow.tag,
          startedAt: completed.startedAt,
          subject: completed.flow.tag,
          blocks: completed.flow.blocks,
          ...(completed.execution ? { execution: completed.execution } : {}),
          durationMinutes,
          focusMinutes: Math.min(durationMinutes, Math.floor(completed.focusMs / 1000) / 60),
          status: completed.skipped ? "stopped" : "completed",
        });
        setSaved(result);
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* Already saved by the API. */
        }
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        saving.current = false;
        setBusy(false);
      }
    },
    [saveSession, storageKey, canControl]
  );

  // One request per completed run. A failed save is retried explicitly with the same ID.
  const requestedId = useRef<string | null>(null);
  useEffect(() => {
    if (canControl && run?.completed && !saved && requestedId.current !== run.id) {
      requestedId.current = run.id;
      void save(run);
    }
  }, [run, saved, save, canControl]);

  const toggle = useCallback(
    () =>
      setRun((current) =>
        current && canControl ? toggleRun(current, timerNow(), prefs.autoStartBreaks) : current
      ),
    [prefs.autoStartBreaks, canControl]
  );
  const reset = useCallback(() => {
    if (!run || busy || !canControl) return;
    if (
      run.startedAt &&
      !saved &&
      !window.confirm("Discard this timer run and start over? Unsaved study time will be lost.")
    )
      return;
    setRun(newRun(run.flow));
    setSaved(null);
    setError("");
    setTransition("");
  }, [run, saved, busy, canControl]);
  const skip = useCallback(
    () =>
      setRun((current) =>
        current && canControl ? skipBlock(current, timerNow(), prefs.autoStartBreaks) : current
      ),
    [prefs.autoStartBreaks, canControl]
  );

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (
        window.location.hash.split("?")[0] !== "#timer" ||
        busy ||
        !canControl ||
        run?.completed ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          event.target.closest("input, textarea, select, button, a"))
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      }
      if (event.code === "KeyR") {
        event.preventDefault();
        reset();
      }
      if (event.code === "KeyS" && run?.startedAt) {
        event.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggle, reset, skip, busy, canControl, run?.completed, run?.startedAt]);

  function reflect() {
    if (!saved) return;
    try {
      sessionStorage.setItem("methodica-reflection-session", saved.id);
    } catch {
      /* The reflection picker lists every session. */
    }
    navigate("reflect");
  }
  const block = run?.flow.blocks[run.blockIndex];
  const progress = block && run ? 1 - run.remainingMs / (block.durationMinutes * 60000) : 0;

  return (
    <section className="screen timer-screen">
      <div className="eyebrow">ONE BLOCK AT A TIME</div>
      <h1 className="page-title">Make room for focus.</h1>
      <p className="page-sub">
        Choose a saved flow. Pause when you need to; only the time you actually run is logged.
      </p>
      {lease.status === "blocked" && (
        <p className="feedback" role="status">
          This timer is controlled by another tab. It will become available when that tab closes or
          leaves its idle timer screen.
        </p>
      )}
      {lease.status === "unavailable" && (
        <p className="feedback" role="alert">
          This browser cannot coordinate timer tabs. Update your browser or try another browser
          before starting a session.{" "}
          <button className="text-button" onClick={lease.retry}>
            Try again
          </button>
        </p>
      )}
      {lease.status === "checking" && <p role="status">Reserving timer control...</p>}
      {lease.status === "owned" && !verifiedId && !verificationError && (
        <p role="status">Checking whether this run was already saved...</p>
      )}
      {verificationError && (
        <p role="alert">
          {verificationError}{" "}
          <button className="text-button" onClick={() => setVerificationAttempt((v) => v + 1)}>
            Retry timer recovery
          </button>
        </p>
      )}
      {run?.recovered && !saved && (
        <p className="feedback" role="status">
          Your session was recovered and paused. Resume when you are ready. Time while this page was
          closed was not added.
        </p>
      )}
      {transition && (
        <p className="feedback" role="status">
          {transition}
        </p>
      )}
      <div className="card flow-selector-card">
        <label className="field-label">
          Study flow
          <select
            value={run?.flow.id || ""}
            disabled={!canControl || (!!run?.startedAt && !saved)}
            onChange={(event) => {
              const flow = data?.flows.find((item) => item.id === event.target.value);
              if (flow) {
                setRun(newRun(flow));
                setSaved(null);
                setError("");
                setTransition("");
              }
            }}
          >
            <option value="" disabled>
              Choose a flow
            </option>
            {run && !data?.flows.some((flow) => flow.id === run.flow.id) && (
              <option value={run.flow.id}>{run.flow.title} (session snapshot)</option>
            )}
            {data?.flows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.title} · {flow.totalMinutes} min
              </option>
            ))}
          </select>
        </label>
      </div>
      {!run || !block ? (
        <div className="card empty-state">
          <h2>Your next session starts with a flow.</h2>
          <p>Create a sequence in the builder, or import a starter template.</p>
          <button className="btn" onClick={() => navigate("builder")}>
            Build a flow
          </button>
        </div>
      ) : (
        <div className="card timer-card">
          <span className="tag">
            {run.completed
              ? "Session ended"
              : `${run.deadline ? "In progress" : run.startedAt ? "Paused" : "Ready"} · Block ${run.blockIndex + 1} of ${run.flow.blocks.length}`}
          </span>
          <div className="timer-display">
            <svg width="240" height="240" className="timer-ring" aria-hidden="true">
              <circle className="ring-bg" cx="120" cy="120" r="110" strokeWidth="8" fill="none" />
              <circle
                className="ring-progress"
                cx="120"
                cy="120"
                r="110"
                strokeWidth="8"
                fill="none"
                strokeDasharray={Math.PI * 220}
                strokeDashoffset={Math.PI * 220 * (1 - progress)}
              />
            </svg>
            <div className="timer-clock" role="timer" aria-label="Time remaining">
              {timeLabel(run.remainingMs)}
            </div>
          </div>
          <h2>{block.title}</h2>
          <p className="muted">{run.flow.title}</p>
          <p className="muted block-prompt">
            {studyTypes.find((item) => item.id === (block.studyTypeId || block.type))?.instructions}
          </p>
          <ol className="run-blocks">
            {run.flow.blocks.map((item, index) => (
              <li key={item.id} className={index === run.blockIndex ? "current" : ""}>
                <span>
                  {String(index + 1).padStart(2, "0")} · {item.title}
                </span>
                <span>{item.durationMinutes}m</span>
              </li>
            ))}
          </ol>
          <div className="timer-controls">
            <button
              className="btn btn-lg"
              disabled={!canControl || run.completed || busy}
              onClick={toggle}
            >
              {run.deadline ? "Pause" : run.startedAt ? "Resume" : "Start session"}
            </button>
            <button className="btn ghost" disabled={!canControl || busy} onClick={reset}>
              {saved ? "Study again" : "Reset"}
            </button>
            <button
              className="btn ghost"
              disabled={
                !canControl ||
                run.completed ||
                !run.startedAt ||
                run.blockIndex >= run.flow.blocks.length - 1 ||
                busy
              }
              onClick={skip}
            >
              Skip block
            </button>
          </div>
          <button
            className="text-button"
            disabled={
              !canControl ||
              !run.startedAt ||
              run.completed ||
              busy ||
              tick(run, timerNow()).elapsedMs < 1000
            }
            onClick={() =>
              setRun((current) =>
                current ? finishRun(current, timerNow(), prefs.autoStartBreaks) : null
              )
            }
          >
            Finish & save elapsed time
          </button>
          <p className="muted">
            {(run.elapsedMs / 60000).toFixed(1)} min elapsed · {(run.focusMs / 60000).toFixed(1)}{" "}
            min studying
          </p>
          <p className="timer-hints">
            <kbd>Space</kbd> Start/pause · <kbd>R</kbd> Reset · <kbd>S</kbd> Skip
          </p>
          {busy && <p role="status">Saving your session…</p>}
          {storageError && (
            <p className="feedback" role="status">
              {storageError}
            </p>
          )}
          {error && (
            <div className="feedback" role="alert">
              {error}{" "}
              {run.completed && (
                <button
                  className="btn ghost"
                  onClick={() => void save(run)}
                  disabled={!canControl || busy}
                >
                  Retry save
                </button>
              )}
            </div>
          )}
          {saved && (
            <div className="feedback" role="status">
              <b>Session saved.</b> Find it in your history, or take a moment to reflect.
              <div className="inline-actions">
                <button className="btn" onClick={reflect}>
                  Add reflection
                </button>
                <button className="btn ghost" onClick={() => navigate("history")}>
                  View history
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
