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
import Auth from "./screens/Auth";
import { currentScreen, navigate } from "./lib/navigation";
import { useWorkspace } from "./lib/useWorkspace";

export default function App() {
  const [screen, setScreen] = useState(currentScreen);
  const { data, studyTypes, mode, user, loading, error, reload, startDevice, logout } =
    useWorkspace();
  const [accountError, setAccountError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const needsWorkspace = ![
    "studytypes",
    "settings",
    "sync",
    "crud-demo",
    "login",
    "register",
  ].includes(screen);
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
          <div className="account-actions">
            <span className="workspace-badge">
              {mode === "device"
                ? "Saved on this device"
                : data
                  ? "Saved to your account"
                  : "Guest workspace"}
            </span>
            {user ? (
              <>
                <span className="account-name">{user.name}</span>
                <button
                  className="btn ghost"
                  disabled={loggingOut}
                  onClick={async () => {
                    setLoggingOut(true);
                    setAccountError("");
                    try {
                      await logout();
                      navigate("login");
                    } catch {
                      setAccountError("Could not log out. Check your connection and try again.");
                    } finally {
                      setLoggingOut(false);
                    }
                  }}
                >
                  {loggingOut ? "Logging out…" : "Log out"}
                </button>
              </>
            ) : (
              <>
                <button className="btn ghost" onClick={() => navigate("login")}>
                  Log in
                </button>
                <button className="btn" onClick={() => navigate("register")}>
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
        {accountError && (
          <p className="screen feedback" role="alert">
            {accountError}
          </p>
        )}
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
            <h1 className="page-title">Your next session starts here.</h1>
            <p className="page-sub">
              Log in to open your private study workspace, or create an account to get started.
            </p>
            <p className="muted">
              Device workspaces stay in this browser and do not sync or publish to other people.
              Export a backup in Settings; clearing site data removes your device workspace.
            </p>
            <div className="account-actions">
              <button className="btn" onClick={() => navigate("register")}>
                Create an account
              </button>
              <button className="btn ghost" onClick={() => navigate("login")}>
                Log in
              </button>
            </div>
            <button
              className="btn ghost"
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
            Your study data is saved in this browser. Log in to use a separate account workspace.
            Export a backup in Settings before clearing browser data.
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
              <Timer key={`${mode}-${mode === "server" ? user?.id : "guest"}`} />
            </div>
          </>
        )}
        {screen === "sync" && <SyncSettings />}
        {screen === "settings" && <Settings />}
        {screen === "crud-demo" && <CrudDemo />}
        {(screen === "login" || screen === "register") && (
          <Auth key={screen} registering={screen === "register"} />
        )}
      </main>
    </>
  );
}
