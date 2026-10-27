import { useWorkspace } from "../lib/useWorkspace";

export default function SyncSettings() {
  const { data, mode, loading, error, refreshedAt, reload, connectServer, startDevice } =
    useWorkspace();
  return (
    <section className="screen">
      <div className="eyebrow">YOUR WORKSPACE CONNECTION</div>
      <h1 className="page-title">Keep your progress close.</h1>
      <p className="page-sub">
        See where your study data is saved and reload the current workspace.
      </p>
      <div className="card sync-status">
        <div className="sync-icon" aria-hidden="true">
          ↻
        </div>
        <div className="info">
          <b>
            {loading
              ? "Loading…"
              : mode === "device" && data
                ? "Saved in this browser"
                : error
                  ? "Online workspace unavailable"
                  : data
                    ? "Connected to study API"
                    : "Not connected"}
          </b>
          <p>
            {refreshedAt
              ? `Last loaded ${refreshedAt.toLocaleTimeString()}`
              : "No workspace loaded yet"}
          </p>
        </div>
        <button
          className="btn"
          disabled={loading}
          onClick={() =>
            void reload().catch(() => {
              /* The global banner shows the error. */
            })
          }
        >
          {loading ? "Loading…" : "Reload workspace"}
        </button>
      </div>
      <div className="card editor-panel">
        <h2>
          {mode === "device"
            ? "This workspace stays on this device."
            : "Cross-device sync is planned."}
        </h2>
        <p className="muted">
          {mode === "device"
            ? "Flows, session history, reflections, and templates are stored in this browser. They are not sent to the study API. Export a backup in Settings before clearing site data or changing devices."
            : "Online workspaces need account sign-in and shared storage before web and mobile can sync. The classroom CRUD exercises use their own separate workstation databases."}
        </p>
        <p>
          Switching workspaces does not copy, upload, or delete your device data. Online storage and
          device storage are kept separate.
        </p>
        {mode === "device" ? (
          <button
            className="btn ghost"
            disabled={loading}
            onClick={() =>
              void connectServer().catch(() => {
                /* Keep device data and show the online error. */
              })
            }
          >
            Check online workspace
          </button>
        ) : (
          <button
            className="btn ghost"
            disabled={loading}
            onClick={() =>
              void startDevice().catch(() => {
                /* The banner presents storage errors. */
              })
            }
          >
            Use a device workspace
          </button>
        )}
      </div>
    </section>
  );
}
