import { useEffect, useState } from "react";
import { DEFAULT_PREFS, applyTheme, loadPrefs, savePrefs } from "../lib/preferences";
import { errorMessage } from "../lib/api";
import { download, sessionsCsv } from "../lib/export";
import type { SettingsPreferences } from "../types";
import { useWorkspace } from "../lib/useWorkspace";

export default function Settings() {
  const { getWorkspace, data } = useWorkspace();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "unsupported"
  );
  useEffect(() => {
    applyTheme(prefs.theme);
    try {
      savePrefs(prefs);
    } catch {
      setError("This browser cannot save preferences. Changes will last until you reload.");
    }
  }, [prefs]);
  function update<K extends keyof SettingsPreferences>(key: K, value: SettingsPreferences[K]) {
    setMessage("");
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }
  async function notifications() {
    if (prefs.notifications && permission === "granted") {
      update("notifications", false);
      return;
    }
    if (!("Notification" in window)) return;
    try {
      const status = await Notification.requestPermission();
      setPermission(status);
      update("notifications", status === "granted");
      if (status !== "granted")
        setMessage(
          "Notifications are blocked. You can change this in your browser's site settings."
        );
    } catch {
      setError("This browser could not enable notifications.");
    }
  }
  async function exportData() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const workspace = await getWorkspace();
      const date = new Date().toISOString().slice(0, 10);
      if (prefs.dataExportFormat === "csv")
        download(
          sessionsCsv(workspace.sessions),
          `methodica-sessions-${date}.csv`,
          "text/csv;charset=utf-8"
        );
      else
        download(
          JSON.stringify(
            { exportedAt: new Date().toISOString(), workspace, preferences: prefs },
            null,
            2
          ),
          `methodica-export-${date}.json`
        );
      setMessage("Export downloaded.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    if (
      !window.confirm(
        "Reset Methodica preferences in this browser? Saved flows, sessions, and reflections will stay in your workspace."
      )
    )
      return;
    setPrefs({ ...DEFAULT_PREFS });
    setMessage("Browser preferences reset.");
  }
  const duration = (key: "sessionDuration" | "breakDuration", min: number, max: number) => (
    <input
      aria-label={key === "sessionDuration" ? "Default session length" : "Default break duration"}
      className="duration-field"
      type="number"
      min={min}
      max={max}
      step={1}
      value={prefs[key]}
      onChange={(event) =>
        update(key, Math.min(max, Math.max(min, Number(event.target.value) || min)))
      }
    />
  );
  return (
    <section className="screen">
      <div className="eyebrow">MAKE IT YOURS</div>
      <h1 className="page-title">A workspace that fits.</h1>
      <p className="page-sub">Set your appearance, study defaults, and browser preferences.</p>
      <div className="card settings-section">
        <div className="section-header">
          <h2 className="section-title">Appearance</h2>
          <p className="section-desc">Applied across the app, including after refresh.</p>
        </div>
        <div className="setting-row">
          <label htmlFor="theme" className="setting-label">
            <b>Theme</b>
            <span className="setting-desc">Follow your device, or choose your own.</span>
          </label>
          <select
            id="theme"
            value={prefs.theme}
            onChange={(event) =>
              update("theme", event.target.value as SettingsPreferences["theme"])
            }
          >
            <option value="system">System default</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
      <div className="card settings-section">
        <div className="section-header">
          <h2 className="section-title">Session defaults</h2>
          <p className="section-desc">
            New blocks use these defaults. Existing flows keep their saved durations.
          </p>
        </div>
        <div className="setting-row">
          <div className="setting-label">
            <b>Default session length</b>
            <span className="setting-desc">First focus block in a new flow · 5–120 min</span>
          </div>
          {duration("sessionDuration", 5, 120)}
        </div>
        <div className="setting-row">
          <div className="setting-label">
            <b>Default break duration</b>
            <span className="setting-desc">New rest blocks in the builder · 1–30 min</span>
          </div>
          {duration("breakDuration", 1, 30)}
        </div>
        <div className="setting-row">
          <label className="setting-label" htmlFor="auto-break">
            <b>Auto-start breaks</b>
            <span className="setting-desc">Turn off to pause before each rest block.</span>
          </label>
          <button
            id="auto-break"
            className={`switch${prefs.autoStartBreaks ? " on" : ""}`}
            role="switch"
            aria-checked={prefs.autoStartBreaks}
            onClick={() => update("autoStartBreaks", !prefs.autoStartBreaks)}
          />
        </div>
      </div>
      <div className="card settings-section">
        <div className="section-header">
          <h2 className="section-title">Notifications</h2>
          <p className="section-desc">
            Block-transition alerts while the timer is running in an open tab.
          </p>
        </div>
        <div className="setting-row">
          <label className="setting-label" htmlFor="notifications">
            <b>Browser notifications</b>
            <span className="setting-desc">
              {permission === "unsupported"
                ? "Not supported in this browser."
                : permission === "denied"
                  ? "Blocked by your browser. Enable in site settings first."
                  : permission === "granted"
                    ? "Browser permission granted."
                    : "Your browser will ask for permission."}
            </span>
          </label>
          <button
            id="notifications"
            className={`switch${prefs.notifications && permission === "granted" ? " on" : ""}`}
            role="switch"
            aria-checked={prefs.notifications && permission === "granted"}
            disabled={permission === "unsupported" || permission === "denied"}
            onClick={() => void notifications()}
          />
        </div>
        <p className="settings-note muted">Scheduled reminders and weekly reports are planned.</p>
      </div>
      <div className="card settings-section">
        <div className="section-header">
          <h2 className="section-title">Your data</h2>
          <p className="section-desc">
            JSON includes flows, templates, sessions, reflections, and preferences. CSV includes
            session records and reflections.
          </p>
        </div>
        <div className="setting-row">
          <label htmlFor="export-format">
            <b>Export format</b>
          </label>
          <select
            id="export-format"
            value={prefs.dataExportFormat}
            onChange={(event) =>
              update(
                "dataExportFormat",
                event.target.value as SettingsPreferences["dataExportFormat"]
              )
            }
          >
            <option value="json">JSON · full workspace</option>
            <option value="csv">CSV · sessions</option>
          </select>
        </div>
        <div className="setting-row">
          <div className="setting-label">
            <b>Download your data</b>
            <span className="setting-desc">Exports Methodica data from this workspace only.</span>
          </div>
          <button className="btn ghost" disabled={busy || !data} onClick={() => void exportData()}>
            {busy ? "Preparing…" : "Export data"}
          </button>
        </div>
        <div className="setting-row">
          <div className="setting-label">
            <b>Reset browser preferences</b>
            <span className="setting-desc">Your saved study data is not removed.</span>
          </div>
          <button className="btn ghost" onClick={reset}>
            Reset preferences
          </button>
        </div>
      </div>
      {error && (
        <p className="feedback" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="feedback" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
