import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./screens/Dashboard";
import FlowBuilder from "./screens/FlowBuilder";
import StudyTypes from "./screens/StudyTypes";
import SyncSettings from "./screens/SyncSettings";
import CommunityHub from "./screens/CommunityHub";
import Reflection from "./screens/Reflection";
import SessionHistory from "./screens/SessionHistory";
import Settings from "./screens/Settings";
import Timer from "./screens/Timer";
import CrudDemo from "./screens/CrudDemo";
import { currentScreen, navigate } from "./lib/navigation";
import { useWorkspace } from "./lib/useWorkspace";

export default function App() {
  const [screen, setScreen] = useState(currentScreen);
  const { data, studyTypes, mode, loading, error, reload, startDevice } = useWorkspace();
  const needsWorkspace = !["studytypes", "settings", "sync", "crud-demo"].includes(screen);
  useEffect(() => {
    const change = () => {
      setScreen(currentScreen());
      document.querySelector("main")?.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.title = `${screen === "dashboard" ? "Your workspace" : screen.charAt(0).toUpperCase() + screen.slice(1)} · Methodica`;
  }, [screen]);
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <Sidebar active={screen} onNavigate={navigate} />
      <main className="main" id="main-content" tabIndex={-1}>
        <div className="workspace-bar">
          <span>STUDY WITH INTENTION</span>
          <span className="workspace-badge">
            {mode === "device"
              ? "Saved on this device"
              : data
                ? "Connected workspace"
                : "Workspace unavailable"}
          </span>
        </div>
        {error && (
          <div className="screen feedback" role="alert">
            {error}{" "}
            <button
              className="btn ghost"
              disabled={loading}
              onClick={() =>
                void reload().catch(() => {
                  /* Banner shows connection errors. */
                })
              }
            >
              {loading ? "Connecting…" : "Retry connection"}
            </button>
          </div>
        )}
        {loading && !data && (
          <p className="screen" role="status">
            Opening your study workspace…
          </p>
        )}
        {!loading && !data && needsWorkspace && (
          <section className="screen card editor-panel">
            <div className="eyebrow">YOUR STUDY WORKSPACE</div>
            <h1 className="page-title">Keep learning on this device.</h1>
            <p className="page-sub">
              The online workspace is not available yet. You can build flows, run sessions, and save
              reflections in this browser.
            </p>
            <p className="muted">
              Device workspaces stay in this browser and do not sync or publish to other people.
              Export a backup in Settings; clearing site data removes your device workspace.
            </p>
            <button
              className="btn"
              disabled={loading}
              onClick={() =>
                void startDevice().catch(() => {
                  /* The banner presents storage or connection errors. */
                })
              }
            >
              Use this device
            </button>
          </section>
        )}
        {mode === "device" && data && (
          <p className="screen scope-note">
            Your study data is saved in this browser. Cross-device sync and public sharing are not
            connected. Export a backup in Settings.
          </p>
        )}
        {screen === "studytypes" && studyTypes.length > 0 && <StudyTypes />}
        {screen === "studytypes" && !loading && studyTypes.length === 0 && (
          <section className="screen card editor-panel">
            <h1 className="page-title">The technique library could not load.</h1>
            <p className="muted">
              Retry the connection above. Your saved study data has not been changed.
            </p>
          </section>
        )}
        {data && (
          <>
            {screen === "dashboard" && <Dashboard />}
            {screen === "builder" && <FlowBuilder />}
            {screen === "community" && <CommunityHub />}
            {screen === "reflect" && <Reflection />}
            {screen === "history" && <SessionHistory />}
            <div hidden={screen !== "timer"}>
              <Timer key={mode} />
            </div>
          </>
        )}
        {screen === "sync" && <SyncSettings />}
        {screen === "settings" && <Settings />}
        {screen === "crud-demo" && <CrudDemo />}
      </main>
    </>
  );
}
