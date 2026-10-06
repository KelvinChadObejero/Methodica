// Screens currently implemented in this Should-Have preview.
// "dashboard" | "builder" | "studytypes" are the Must-Have screens (built by your partner)
// and are listed here only so the sidebar can render them as disabled nav items.
export type Screen = "dashboard" | "builder" | "studytypes" | "sync" | "community" | "reflect";

export interface NavEntry {
  screen: Screen;
  label: string;
  enabled: boolean;
}

export interface StudyFlowTemplate {
  id: string;
  title: string;
  author: string;
  tag: string;
  rating: number;
  usedBy: number;
}

export interface SyncPreferences {
  autoSyncWifi: boolean;
  autoSyncCellular: boolean;
  backgroundSync: boolean;
}

export interface ReflectionEntry {
  sessionTitle: string;
  sessionSubtitle: string;
  comprehension: number;
  fatigue: number;
  notes: string;
}
