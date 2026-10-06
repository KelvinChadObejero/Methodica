import type { NavEntry, Screen } from "../types";

const CORE_ITEMS: NavEntry[] = [
  { screen: "dashboard", label: "Dashboard", enabled: true },
  { screen: "builder", label: "Flow Builder", enabled: false },
  { screen: "studytypes", label: "StudyTypes", enabled: false },
];

const SHOULD_HAVE_ITEMS: NavEntry[] = [
  { screen: "sync", label: "Sync Settings", enabled: true },
  { screen: "community", label: "Community Hub", enabled: true },
  { screen: "reflect", label: "Reflection", enabled: true },
  { screen: "history", label: "Session History", enabled: true },
  { screen: "timer", label: "Study Timer", enabled: true },
  { screen: "settings", label: "Settings", enabled: true },
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
      onClick={() => entry.enabled && onNavigate(entry.screen)}
    >
      {entry.enabled && <span className="dot" />}
      {entry.label}
    </button>
  );
}

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="brand">
        <div className="brand-mark">M</div>
        <div className="brand-name">Methodica</div>
      </div>

      <div className="nav-group-label">Core</div>
      {CORE_ITEMS.map((entry) => (
        <NavButton key={entry.screen} entry={entry} active={active} onNavigate={onNavigate} />
      ))}

      <div className="nav-group-label">Should-Have</div>
      {SHOULD_HAVE_ITEMS.map((entry) => (
        <NavButton key={entry.screen} entry={entry} active={active} onNavigate={onNavigate} />
      ))}

      <div className="sidebar-foot">
        Frontend preview &middot; <b>React + TypeScript</b>
        <br />
        Should-Have items 1&ndash;3
      </div>
    </nav>
  );
}
