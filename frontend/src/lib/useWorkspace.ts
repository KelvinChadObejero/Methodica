import { createContext, useContext } from "react";
import type { ReflectionEntry, SessionLog, StudyFlow, StudyType, Workspace } from "../types";

export interface WorkspaceContextValue {
  data: Workspace | null;
  studyTypes: StudyType[];
  loading: boolean;
  error: string;
  refreshedAt: Date | null;
  reload: () => Promise<void>;
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
