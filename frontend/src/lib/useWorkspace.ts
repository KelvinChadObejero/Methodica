import { createContext, useContext } from "react";
import type { ReflectionEntry, SessionLog, StudyFlow, StudyType, Workspace } from "../types";
import type { ImportSummary } from "../../../backend/src/workspace-import";

export interface WorkspaceContextValue {
  user: { id: string; name: string; email: string } | null;
  accountsAvailable: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  data: Workspace | null;
  mode: "server" | "device";
  studyTypes: StudyType[];
  loading: boolean;
  error: string;
  refreshedAt: Date | null;
  reload: () => Promise<void>;
  startDevice: () => Promise<void>;
  connectServer: () => Promise<void>;
  getWorkspace: () => Promise<Workspace>;
  importDeviceWorkspace: (workspace: Workspace, reviewToken: string) => Promise<ImportSummary>;
  saveFlow: (flow: StudyFlow, isNew: boolean) => Promise<StudyFlow>;
  deleteFlow: (id: string) => Promise<void>;
  saveSession: (session: Omit<SessionLog, "hasReflection" | "reflection">) => Promise<SessionLog>;
  saveReflection: (
    id: string,
    entry: Pick<ReflectionEntry, "comprehension" | "fatigue" | "notes">
  ) => Promise<void>;
  importTemplate: (id: string) => Promise<void>;
  publishFlow: (id: string, author: string) => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("WorkspaceProvider is missing.");
  return value;
}
