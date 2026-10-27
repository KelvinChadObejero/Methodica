import type { NavEntry, Screen } from "../types";

const CORE_ITEMS: NavEntry[] = [
  { screen: "dashboard", label: "Dashboard", enabled: true },
  { screen: "builder", label: "Flow Builder", enabled: true },
  { screen: "studytypes", label: "StudyTypes", enabled: true },
  { screen: "timer", label: "Study Timer", enabled: true },
  { screen: "history", label: "Session History", enabled: true },
];

const SHOULD_HAVE_ITEMS: NavEntry[] = [
  { screen: "sync", label: "Workspace Connection", enabled: true },
  { screen: "community", label: "Community Hub", enabled: true },
  { screen: "reflect", label: "Reflection", enabled: true },
  { screen: "settings", label: "Settings", enabled: true },
  { screen: "crud-demo", label: "Classroom CRUD Demo", enabled: true },
];

interface SidebarProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

function NavButton({
  entry,
  active,
  onNavigate,
}: {
  entry: NavEntry;
  active: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const isActive = entry.screen === active;
  const classes = ["nav-item", isActive ? "active" : "", !entry.enabled ? "disabled" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={!entry.enabled}
      aria-current={isActive ? "page" : undefined}
      onClick={() => entry.enabled && onNavigate(entry.screen)}
    >
      {entry.enabled && <span className="dot" />}
      {entry.label}
    </button>
  );
}

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="brand">
        <div className="brand-mark">M</div>
        <div className="brand-name">Methodica</div>
      </div>

      <div className="nav-group-label">Your workspace</div>
      {CORE_ITEMS.map((entry) => (
        <NavButton key={entry.screen} entry={entry} active={active} onNavigate={onNavigate} />
      ))}

      <div className="nav-group-label">Connect & reflect</div>
      {SHOULD_HAVE_ITEMS.map((entry) => (
        <NavButton key={entry.screen} entry={entry} active={active} onNavigate={onNavigate} />
      ))}

      <div className="sidebar-foot">
        A little structure.
        <br />A lot of possibility.
      </div>
    </nav>
  );
}
