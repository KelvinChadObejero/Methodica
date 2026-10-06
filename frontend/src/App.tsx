import { useState } from "react";
import Sidebar from "./components/Sidebar";
import SyncSettings from "./screens/SyncSettings";
import CommunityHub from "./screens/CommunityHub";
import Reflection from "./screens/Reflection";
import type { Screen } from "./types";

export default function App() {
  // Defaults to "sync" since Dashboard/Builder/StudyTypes aren't built yet.
  // Once your partner's Must-Have screens land, wire this up with
  // react-router instead of local state.
  const [screen, setScreen] = useState<Screen>("sync");

  return (
    <>
      <Sidebar active={screen} onNavigate={setScreen} />
      <main className="main">
        {screen === "sync" && <SyncSettings />}
        {screen === "community" && <CommunityHub />}
        {screen === "reflect" && <Reflection />}
      </main>
    </>
  );
}
