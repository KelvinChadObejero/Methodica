import { useCallback, useEffect, useState, type ReactNode } from "react";
import type {
  ReflectionEntry,
  SessionLog,
  StudyFlow,
  StudyFlowTemplate,
  StudyType,
  Workspace,
} from "../types";
import { api, errorMessage } from "./api";
import { WorkspaceContext } from "./useWorkspace";

type NewSession = Omit<SessionLog, "hasReflection" | "reflection">;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [studyTypes, setStudyTypes] = useState<StudyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [workspace, techniques] = await Promise.all([
        api<Workspace>("/workspace"),
        api<StudyType[]>("/studytypes"),
      ]);
      setData(workspace);
      setStudyTypes(techniques);
      setError("");
      setRefreshedAt(new Date());
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload().catch(() => {
      /* The connection banner presents the error. */
    });
  }, [reload]);

  async function saveFlow(flow: StudyFlow, isNew: boolean) {
    const saved = await api<StudyFlow>(
      isNew ? "/flows" : `/flows/${encodeURIComponent(flow.id)}`,
      isNew ? "POST" : "PUT",
      flow
    );
    setData(
      (prev) =>
        prev && { ...prev, flows: [saved, ...prev.flows.filter((item) => item.id !== saved.id)] }
    );
    return saved;
  }

  async function deleteFlow(id: string) {
    await api(`/flows/${encodeURIComponent(id)}`, "DELETE");
    setData((prev) => prev && { ...prev, flows: prev.flows.filter((item) => item.id !== id) });
  }

  async function saveSession(session: NewSession) {
    const saved = await api<SessionLog>("/sessions", "POST", session);
    setData(
      (prev) =>
        prev && {
          ...prev,
          sessions: [saved, ...prev.sessions.filter((item) => item.id !== saved.id)],
        }
    );
    return saved;
  }

  async function saveReflection(
    id: string,
    entry: Pick<ReflectionEntry, "comprehension" | "fatigue" | "notes">
  ) {
    const saved = await api<SessionLog>(`/sessions/${encodeURIComponent(id)}/log`, "PUT", entry);
    setData(
      (prev) =>
        prev && {
          ...prev,
          sessions: prev.sessions.map((session) => (session.id === id ? saved : session)),
        }
    );
  }

  async function importTemplate(id: string) {
    const flow = await api<StudyFlow>(`/templates/${encodeURIComponent(id)}/import`, "POST");
    setData(
      (prev) =>
        prev && { ...prev, flows: [flow, ...prev.flows.filter((item) => item.id !== flow.id)] }
    );
  }

  async function publishFlow(id: string, author: string) {
    const template = await api<StudyFlowTemplate>(
      `/flows/${encodeURIComponent(id)}/publish`,
      "POST",
      { author }
    );
    setData(
      (prev) =>
        prev && {
          ...prev,
          templates: [template, ...prev.templates.filter((item) => item.id !== template.id)],
        }
    );
  }

  return (
    <WorkspaceContext.Provider
      value={{
        data,
        studyTypes,
        loading,
        error,
        refreshedAt,
        reload,
        saveFlow,
        deleteFlow,
        saveSession,
        saveReflection,
        importTemplate,
        publishFlow,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
