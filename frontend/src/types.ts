// Screens currently implemented in this preview.
// The first three (dashboard, builder, studytypes) are Must-Have screens.
// Dashboard is now implemented; the other two remain placeholders for your partner.
// "history" is a Should-Have screen (Session History).
export type Screen = "dashboard" | "builder" | "studytypes" | "sync" | "community" | "reflect" | "history";

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

export interface SessionLog {
  id: string;
  flowTitle: string;
  flowTag: string;
  startedAt: string; // ISO timestamp
  durationMinutes: number;
  subject: string;
  hasReflection: boolean;
  reflection?: ReflectionEntry;
}
