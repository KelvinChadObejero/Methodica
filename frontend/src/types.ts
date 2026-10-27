// Screen IDs are also the browser's hash routes.
export type Screen =
  | "dashboard"
  | "builder"
  | "studytypes"
  | "sync"
  | "community"
  | "reflect"
  | "history"
  | "settings"
  | "timer"
  | "crud-demo";

export interface NavEntry {
  screen: Screen;
  label: string;
  enabled: boolean;
}

export type {
  StudyFlowTemplate,
  StudyFlow,
  StudyBlock,
  StudyType,
  ReflectionEntry,
  SessionLog,
  Workspace,
} from "../../backend/src/domain";

export interface SettingsPreferences {
  theme: "system" | "light" | "dark";
  notifications: boolean;
  sessionReminders: boolean;
  weeklyReport: boolean;
  autoStartBreaks: boolean;
  breakDuration: number; // minutes
  sessionDuration: number; // minutes
  dataExportFormat: "json" | "csv";
}
