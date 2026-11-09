import { useEffect, useState } from "react";
import { useWorkspace } from "../lib/useWorkspace";
import { navigate } from "../lib/navigation";
import type { StudyReport } from "../../../backend/src/reporting";
import { errorMessage } from "../lib/api";
import { download } from "../lib/export";
export default function Dashboard() {
  const { data, getReport, exportReport } = useWorkspace();
  const [range, setRange] = useState(7);
  const [summary, setSummary] = useState<StudyReport | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setError("");
    void getReport(range, timezone)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [getReport, data, range, timezone, retry]);
  async function exportCsv() {
    if (!summary) return;
    setExporting(true);
    setError("");
    try {
      download(await exportReport(summary), "methodica-report.csv", "text/csv;charset=utf-8");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setExporting(false);
    }
  }
  if (!summary)
    return (
      <section className="screen">
        <h1 className="page-title">Your learning, in progress.</h1>
        {error ? <p role="alert">{error}</p> : <p role="status">Loading your report…</p>}
        <button className="btn ghost" onClick={() => setRetry((v) => v + 1)}>
          Refresh report
        </button>
      </section>
    );
  const binSize = Math.ceil(range / 7);
  const daily = Array.from({ length: Math.ceil(summary.daily.length / binSize) }, (_, i) => {
    const days = summary.daily.slice(i * binSize, (i + 1) * binSize);
    return {
      key: days[0].key,
      label: days.length === 1 ? days[0].label : `${days[0].label}–${days[days.length - 1].label}`,
      minutes: days.reduce((sum, d) => sum + d.minutes, 0),
    };
  });
  const maximum = Math.max(...daily.map((day) => day.minutes), 1);
  return (
    <section className="screen dashboard-screen">
      <div className="eyebrow">YOUR LEARNING, IN PROGRESS</div>
      <div className="page-heading">
        <div>
          <h1 className="page-title">Small sessions. Steady progress.</h1>
          <p className="page-sub">
            A clear view of the time and attention you have put into learning.
          </p>
        </div>
        <button className="btn" onClick={() => navigate("timer")}>
          Start a session →
        </button>
      </div>
      <div className="card toolbar-card">
        <div className="segmented" aria-label="Analytics time range">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              aria-pressed={range === days}
              className={`segment${range === days ? " active" : ""}`}
              onClick={() => setRange(days)}
            >
              Last {days} days
            </button>
          ))}
        </div>
        <button
          className="btn ghost"
          disabled={!summary.count || exporting}
          onClick={() => void exportCsv()}
        >
          {exporting ? "Exporting…" : "Export report"}
        </button>
      </div>
      <p className="muted">
        Calendar days in {summary.timezone}. Study time is credited to the day a session starts.
        Partial study sessions count toward your streak.
      </p>
      {error && (
        <p role="alert">
          {error}{" "}
          <button className="text-button" onClick={() => setRetry((v) => v + 1)}>
            Refresh report
          </button>
        </p>
      )}
      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-label">Study time</div>
          <div className="stat-value">
            {summary.focusMinutes < 60
              ? summary.focusMinutes.toFixed(1)
              : (summary.focusMinutes / 60).toFixed(1)}
            <span className="stat-unit">{summary.focusMinutes < 60 ? " min" : " hrs"}</span>
          </div>
          <div className="stat-sub">Breaks and paused time excluded</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Sessions logged</div>
          <div className="stat-value">{summary.count}</div>
          <div className="stat-sub">{summary.completed} completed in full</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Current study streak</div>
          <div className="stat-value">
            {summary.streak}
            <span className="stat-unit"> days</span>
          </div>
          <div className="stat-sub">Across all your saved sessions</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Reflections saved</div>
          <div className="stat-value">{summary.reflections}</div>
          <div className="stat-sub">Learn a little about how you learn</div>
        </div>
      </div>
      {!summary.totalSessions && (
        <div className="card welcome-panel">
          <div>
            <span className="tag">A FRESH START</span>
            <h2>Your progress begins with one session.</h2>
            <p className="muted">
              Build a flow that fits your subject, run it at your pace, and notice what works.
            </p>
          </div>
          <button className="btn ghost" onClick={() => navigate("builder")}>
            Build your first flow →
          </button>
        </div>
      )}
      <div className="dashboard-columns">
        <div className="card chart-panel">
          <div className="panel-heading">
            <h2>Attention over time</h2>
            <span className="muted">Study minutes · last {range} days</span>
          </div>
          <div
            className="weekly-bars"
            style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))` }}
            role="img"
            aria-label={daily
              .map((day) => `${day.label}: ${day.minutes.toFixed(1)} study minutes`)
              .join(", ")}
          >
            {daily.map((day) => (
              <div className="day-column" key={day.key}>
                <span className="day-value">{Math.round(day.minutes)}</span>
                <div className="bar-track">
                  <div
                    className="day-bar"
                    style={{ height: `${(day.minutes / maximum) * 100}%` }}
                  />
                </div>
                <span className="day-label">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card chart-panel">
          <div className="panel-heading">
            <h2>Where your time goes</h2>
            <span className="muted">Last {range} days</span>
          </div>
          {summary.subjects.length ? (
            summary.subjects.map(([subject, minutes]) => (
              <div className="subject-summary" key={subject}>
                <div>
                  <b>{subject}</b>
                  <span className="muted">{minutes.toFixed(1)} min</span>
                </div>
                <div className="subject-meter">
                  <span
                    style={{
                      width: `${summary.focusMinutes ? (minutes / summary.focusMinutes) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="muted">
              Your subjects will appear here when you save a session in this date range.
            </p>
          )}
          <button className="text-button section-link" onClick={() => navigate("history")}>
            Explore session history →
          </button>
        </div>
      </div>
      <div className="panel-heading section">
        <h2>Ready when you are</h2>
        <button className="text-button" onClick={() => navigate("builder")}>
          Manage flows →
        </button>
      </div>
      <div className="grid">
        {data?.flows.slice(0, 4).map((flow) => (
          <div className="card flow-overview" key={flow.id}>
            <span className="tag">{flow.tag}</span>
            <h3>{flow.title}</h3>
            <p className="muted">
              {flow.blocks.length} blocks · {flow.totalMinutes} minutes
            </p>
            <div className="flow-sequence">
              {flow.blocks.map((block) => (
                <span key={block.id}>{block.title}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
