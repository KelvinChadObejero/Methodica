import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./screens/Dashboard";
import SyncSettings from "./screens/SyncSettings";
import CommunityHub from "./screens/CommunityHub";
import Reflection from "./screens/Reflection";
import SessionHistory from "./screens/SessionHistory";
import Settings from "./screens/Settings";
import type { Screen } from "./types";

export default function App() {
  // Defaults to "dashboard" now that it's implemented.
  // Once your partner's remaining Must-Have screens land, wire this up with
  // react-router instead of local state.
  const [screen, setScreen] = useState<Screen>("dashboard");

  return (
    <>
      <Sidebar active={screen} onNavigate={setScreen} />
      <main className="main">
        {screen === "dashboard" && <Dashboard />}
        {screen === "sync" && <SyncSettings />}
        {screen === "community" && <CommunityHub />}
        {screen === "reflect" && <Reflection />}
        {screen === "history" && <SessionHistory />}
        {screen === "settings" && <Settings />}
      </main>
    </>
  );
}
