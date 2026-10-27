import { useWorkspace } from "../lib/useWorkspace";

export default function SyncSettings() {
  const { data, loading, error, refreshedAt, reload } = useWorkspace();
  return (
    <section className="screen">
      <div className="eyebrow">YOUR WORKSPACE CONNECTION</div>
      <h1 className="page-title">Keep your progress close.</h1>
      <p className="page-sub">Reload flows, sessions, and templates saved by this local API.</p>
      <div className="card sync-status">
        <div className="sync-icon" aria-hidden="true">
          ↻
        </div>
        <div className="info">
          <b>
            {loading
              ? "Connecting…"
              : error
                ? "Connection needs attention"
                : data
                  ? "Connected to local API"
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
        <h2>Cross-device sync is planned.</h2>
        <p className="muted">
          Your progress currently belongs to this development server. Account sign-in, a shared
          PostgreSQL database, and conflict handling are needed before the web and mobile apps can
          sync.
        </p>
        <p>
          Wi-Fi, cellular, and background-sync controls will become available with the mobile
          implementation. This browser does not control those network policies.
        </p>
      </div>
    </section>
  );
}
