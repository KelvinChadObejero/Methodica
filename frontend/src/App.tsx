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
  const { data, loading, error, reload } = useWorkspace();
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
          <span className="workspace-badge">Local development workspace</span>
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
        {data && (
          <>
            {screen === "dashboard" && <Dashboard />}
            {screen === "builder" && <FlowBuilder />}
            {screen === "studytypes" && <StudyTypes />}
            {screen === "community" && <CommunityHub />}
            {screen === "reflect" && <Reflection />}
            {screen === "history" && <SessionHistory />}
            <div hidden={screen !== "timer"}>
              <Timer />
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
