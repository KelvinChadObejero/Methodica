import { useState } from "react";
import type { SyncPreferences } from "../types";

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className={`switch${on ? " on" : ""}`}
      role="switch"
      aria-checked={on}
      onClick={onToggle}
    />
  );
}

export default function SyncSettings() {
  const [prefs, setPrefs] = useState<SyncPreferences>({
    autoSyncWifi: true,
    autoSyncCellular: false,
    backgroundSync: true,
  });
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState("just now");

  function toggle(key: keyof SyncPreferences) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSyncNow() {
    setSyncing(true);
    // Placeholder for the real API call your team will wire up later.
    setTimeout(() => {
      setSyncing(false);
      setLastSynced("just now");
    }, 700);
  }

  return (
    <section className="screen">
      <div className="eyebrow">Should-Have &middot; 01</div>
      <h1 className="page-title">Cross-platform sync</h1>
      <p className="page-sub">
        Keep the web and mobile app in step, so a flow you build here is ready to run the moment you
        pick up your phone.
      </p>

      <div className="card sync-status">
        <div className="sync-icon">&#10003;</div>
        <div className="info">
          <b>Up to date</b>
          <p>Last synced {lastSynced} &middot; Web &harr; Mobile</p>
        </div>
        <button className="btn" disabled={syncing} onClick={handleSyncNow}>
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      </div>

      <div className="card">
        <div className="row">
          <div className="label">
            Auto-sync on Wi-Fi
            <span>Sync changes automatically while connected to Wi-Fi</span>
          </div>
          <Switch on={prefs.autoSyncWifi} onToggle={() => toggle("autoSyncWifi")} />
        </div>
        <div className="row">
          <div className="label">
            Auto-sync on cellular
            <span>Uses mobile data to keep sessions current away from Wi-Fi</span>
          </div>
          <Switch on={prefs.autoSyncCellular} onToggle={() => toggle("autoSyncCellular")} />
        </div>
        <div className="row">
          <div className="label">
            Background sync
            <span>Sync while the app isn&apos;t open</span>
          </div>
          <Switch on={prefs.backgroundSync} onToggle={() => toggle("backgroundSync")} />
        </div>
      </div>
    </section>
  );
}
