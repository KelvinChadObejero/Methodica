import { useState, useEffect } from "react";
import type { SettingsPreferences } from "../types";

// ============================================================
// Default preferences & persistence
// ============================================================

const DEFAULT_PREFS: SettingsPreferences = {
  theme: "system",
  notifications: true,
  sessionReminders: true,
  weeklyReport: false,
  autoStartBreaks: true,
  breakDuration: 5,
  sessionDuration: 25,
  dataExportFormat: "json",
};

const STORAGE_KEY = "methodica-settings";

function loadPrefs(): SettingsPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

function savePrefs(prefs: SettingsPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  // Apply theme immediately
  const root = document.documentElement;
  if (prefs.theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", prefs.theme);
  }
}

// ============================================================
// UI Components
// ============================================================

function Switch({ on, onToggle, disabled = false }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      className={`switch${on ? " on" : ""}`}
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      disabled={disabled}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="number-input">
      <button className="num-btn" onClick={() => onChange(Math.max(min, value - step))} disabled={disabled || value <= min}>
        −
      </button>
      <input
        type="number"
        className="num-field"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Math.max(min, Math.max(max, Number(e.target.value) || min));
          onChange(v);
        }}
        onBlur={(e) => {
          const v = Math.max(min, Math.max(max, Number(e.target.value) || min));
          onChange(v);
        }}
        disabled={disabled}
      />
      <button className="num-btn" onClick={() => onChange(Math.min(max, value + step))} disabled={disabled || value >= max}>
        +
      </button>
      {suffix && <span className="num-suffix">{suffix}</span>}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="card settings-section">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {description && <p className="section-desc">{description}</p>}
      </div>
      <div className="section-content">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-label">
        <div className="setting-title">{label}</div>
        {description && <div className="setting-desc">{description}</div>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

function DangerZone({ onExport, onClearData }: { onExport: () => void; onClearData: () => void }) {
  return (
    <div className="card danger-zone">
      <div className="danger-header">
        <span className="danger-icon">⚠</span>
        <div>
          <h3>Danger zone</h3>
          <p>Irreversible actions — proceed with caution.</p>
        </div>
      </div>
      <div className="danger-actions">
        <button className="btn ghost danger-btn" onClick={onExport}>
          Export all data
        </button>
        <button className="btn ghost danger-btn destructive" onClick={onClearData}>
          Clear all local data
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn${destructive ? " destructive" : ""}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Settings Screen
// ============================================================

export default function Settings() {
  const [prefs, setPrefs] = useState<SettingsPreferences>(() => loadPrefs());
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  // Apply theme on mount and when it changes
  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  function updatePref<K extends keyof SettingsPreferences>(key: K, value: SettingsPreferences[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function handleExport() {
    // Collect all localStorage data
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key) || "";
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `methodica-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportComplete(true);
    setTimeout(() => setExportComplete(false), 3000);
    setShowExportConfirm(false);
  }

  function handleClearData() {
    localStorage.clear();
    setPrefs(DEFAULT_PREFS);
    setShowClearConfirm(false);
    // Reload page to reset everything cleanly
    window.location.reload();
  }

  return (
    <section className="screen">
      <div className="eyebrow">Should-Have &middot; 05</div>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">
        Customize your experience — appearance, notifications, session defaults, and data management.
      </p>

      {/* Appearance */}
      <Section title="Appearance" description="Choose how Methodica looks on your devices.">
        <SettingRow
          label="Theme"
          description="System follows your OS setting. Light and dark override it."
        >
          <Select
            value={prefs.theme}
            onChange={(v) => updatePref("theme", v as SettingsPreferences["theme"])}
            options={[
              { value: "system", label: "System default" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </SettingRow>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" description="Control when and how Methodica reaches you.">
        <SettingRow
          label="Push notifications"
          description="Allow Methodica to send browser notifications."
        >
          <Switch on={prefs.notifications} onToggle={() => updatePref("notifications", !prefs.notifications)} />
        </SettingRow>
        <SettingRow
          label="Session reminders"
          description="Get a gentle nudge when it's time for a scheduled study session."
        >
          <Switch on={prefs.sessionReminders} onToggle={() => updatePref("sessionReminders", !prefs.sessionReminders)} disabled={!prefs.notifications} />
        </SettingRow>
        <SettingRow
          label="Weekly progress report"
          description="Receive a summary of your focus time, streaks, and subject balance every Monday."
        >
          <Switch on={prefs.weeklyReport} onToggle={() => updatePref("weeklyReport", !prefs.weeklyReport)} disabled={!prefs.notifications} />
        </SettingRow>
      </Section>

      {/* Session Defaults */}
      <Section title="Session defaults" description="Default values used when starting a new study flow.">
        <SettingRow
          label="Default session length"
          description="Minutes per session. Used by the timer and flow builder."
        >
          <NumberInput
            value={prefs.sessionDuration}
            onChange={(v) => updatePref("sessionDuration", v)}
            min={5}
            max={120}
            step={5}
            suffix="min"
          />
        </SettingRow>
        <SettingRow
          label="Auto-start breaks"
          description="Automatically begin a break timer when a session ends."
        >
          <Switch on={prefs.autoStartBreaks} onToggle={() => updatePref("autoStartBreaks", !prefs.autoStartBreaks)} />
        </SettingRow>
        <SettingRow
          label="Break duration"
          description="Minutes for short breaks between sessions."
        >
          <NumberInput
            value={prefs.breakDuration}
            onChange={(v) => updatePref("breakDuration", v)}
            min={1}
            max={30}
            step={1}
            suffix="min"
            disabled={!prefs.autoStartBreaks}
          />
        </SettingRow>
      </Section>

      {/* Data & Storage */}
      <Section title="Data & storage" description="Manage your local data and backups.">
        <SettingRow
          label="Export format"
          description="File format for data exports."
        >
          <Select
            value={prefs.dataExportFormat}
            onChange={(v) => updatePref("dataExportFormat", v as SettingsPreferences["dataExportFormat"])}
            options={[
              { value: "json", label: "JSON (full fidelity)" },
              { value: "csv", label: "CSV (spreadsheet-friendly)" },
            ]}
          />
        </SettingRow>

        <div className="setting-row">
          <div className="setting-label">
            <div className="setting-title">Export all data</div>
            <div className="setting-desc">Download a backup of your sessions, reflections, preferences, and templates.</div>
          </div>
          <div className="setting-control">
            <button className="btn ghost" onClick={() => setShowExportConfirm(true)} disabled={exportComplete}>
              {exportComplete ? "✓ Exported" : "Export now"}
            </button>
          </div>
        </div>
      </Section>

      {/* Danger Zone */}
      <DangerZone onExport={() => setShowExportConfirm(true)} onClearData={() => setShowClearConfirm(true)} />

      {/* Version info */}
      <div className="version-info">
        Methodica v0.1.0 (Should-Have preview) · React + TypeScript + Vite
      </div>

      {/* Modals */}
      {showExportConfirm && (
        <ConfirmModal
          title="Export data"
          message="Download a JSON file containing all your local Methodica data (sessions, reflections, preferences, templates). This does not remove data from your device."
          confirmLabel="Export"
          onConfirm={handleExport}
          onCancel={() => setShowExportConfirm(false)}
        />
      )}

      {showClearConfirm && (
        <ConfirmModal
          title="Clear all local data"
          message="This will permanently delete all sessions, reflections, preferences, and templates stored in this browser. This cannot be undone. Consider exporting first."
          confirmLabel="Clear everything"
          onConfirm={handleClearData}
          onCancel={() => setShowClearConfirm(false)}
          destructive
        />
      )}
    </section>
  );
}