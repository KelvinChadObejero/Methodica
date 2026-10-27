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
import {
  DeviceWorkspace,
  DEVICE_WORKSPACE_KEY,
  WORKSPACE_MODE_KEY,
  type DeviceSeed,
} from "./device-workspace";

type NewSession = Omit<SessionLog, "hasReflection" | "reflection">;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"server" | "device">(() => {
    try {
      return localStorage.getItem(WORKSPACE_MODE_KEY) === "device" ? "device" : "server";
    } catch {
      return "server";
    }
  });
  const [data, setData] = useState<Workspace | null>(null);
  const [studyTypes, setStudyTypes] = useState<StudyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "device") {
        const seed = new DeviceWorkspace(localStorage).read();
        setData(seed.workspace);
        setStudyTypes(seed.studyTypes);
      } else {
        const [workspace, techniques] = await Promise.allSettled([
          api<Workspace>("/workspace"),
          api<StudyType[]>("/studytypes"),
        ]);
        if (workspace.status === "fulfilled") setData(workspace.value);
        if (techniques.status === "fulfilled") setStudyTypes(techniques.value);
        if (workspace.status === "rejected") throw workspace.reason;
        if (techniques.status === "rejected") throw techniques.reason;
      }
      setError("");
      setRefreshedAt(new Date());
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [mode]);

  async function startDevice() {
    setLoading(true);
    try {
      const store = new DeviceWorkspace(localStorage);
      const seed =
        localStorage.getItem(DEVICE_WORKSPACE_KEY) !== null
          ? store.read()
          : store.initialize(await api<DeviceSeed>("/preview"));
      localStorage.setItem(WORKSPACE_MODE_KEY, "device");
      setData(seed.workspace);
      setStudyTypes(seed.studyTypes);
      setMode("device");
      setError("");
      setRefreshedAt(new Date());
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    } finally {
      setLoading(false);
    }
  }

  async function connectServer() {
    setLoading(true);
    try {
      const [workspace, techniques] = await Promise.all([
        api<Workspace>("/workspace"),
        api<StudyType[]>("/studytypes"),
      ]);
      localStorage.setItem(WORKSPACE_MODE_KEY, "server");
      setData(workspace);
      setStudyTypes(techniques);
      setMode("server");
      setError("");
      setRefreshedAt(new Date());
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    } finally {
      setLoading(false);
    }
  }

  async function getWorkspace() {
    return mode === "device"
      ? new DeviceWorkspace(localStorage).read().workspace
      : api<Workspace>("/workspace");
  }

  function refreshDevice() {
    setData(new DeviceWorkspace(localStorage).read().workspace);
  }

  useEffect(() => {
    void reload().catch(() => {
      /* The connection banner presents the error. */
    });
  }, [reload]);

  async function saveFlow(flow: StudyFlow, isNew: boolean) {
    if (mode === "device") {
      const saved = new DeviceWorkspace(localStorage).saveFlow(flow, isNew);
      refreshDevice();
      return saved;
    }
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
    if (mode === "device") {
      new DeviceWorkspace(localStorage).deleteFlow(id);
      refreshDevice();
      return;
    }
    await api(`/flows/${encodeURIComponent(id)}`, "DELETE");
    setData((prev) => prev && { ...prev, flows: prev.flows.filter((item) => item.id !== id) });
  }

  async function saveSession(session: NewSession) {
    if (mode === "device") {
      const saved = new DeviceWorkspace(localStorage).saveSession(session);
      refreshDevice();
      return saved;
    }
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
    if (mode === "device") {
      new DeviceWorkspace(localStorage).saveReflection(id, entry);
      refreshDevice();
      return;
    }
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
    if (mode === "device") {
      new DeviceWorkspace(localStorage).importTemplate(id);
      refreshDevice();
      return;
    }
    const flow = await api<StudyFlow>(`/templates/${encodeURIComponent(id)}/import`, "POST");
    setData(
      (prev) =>
        prev && { ...prev, flows: [flow, ...prev.flows.filter((item) => item.id !== flow.id)] }
    );
  }

  async function publishFlow(id: string, author: string) {
    if (mode === "device") {
      new DeviceWorkspace(localStorage).publishFlow(id, author);
      refreshDevice();
      return;
    }
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
        mode,
        studyTypes,
        loading,
        error,
        refreshedAt,
        reload,
        startDevice,
        connectServer,
        getWorkspace,
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
