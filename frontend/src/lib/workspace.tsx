import { canonical } from "../../../backend/src/workspace-import";
import { historyPage, type HistoryQuery, type HistoryPage } from "../../../backend/src/history";
import {
  reportQuery,
  studyReport,
  inReport,
  type StudyReport,
} from "../../../backend/src/reporting";
import { sessionsCsv } from "./export";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type {
  ReflectionEntry,
  SessionLog,
  StudyFlow,
  StudyFlowTemplate,
  StudyType,
  Workspace,
} from "../types";
import { ApiError, api, errorMessage, setAccountScope } from "./api";
import { WorkspaceContext } from "./useWorkspace";
import type { ImportSummary } from "../../../backend/src/workspace-import";
import {
  DeviceWorkspace,
  DEVICE_WORKSPACE_KEY,
  WORKSPACE_MODE_KEY,
  type DeviceSeed,
} from "./device-workspace";

type NewSession = Omit<SessionLog, "hasReflection" | "reflection">;
type User = { id: string; name: string; email: string };
function rememberAccountMode() {
  try {
    localStorage.setItem(WORKSPACE_MODE_KEY, "server");
  } catch {
    /* Cookie-based accounts also work when browser storage is disabled. */
  }
}
function notifyAccountChange() {
  try {
    localStorage.setItem("methodica-account-change", crypto.randomUUID());
  } catch {
    /* The API scope check still prevents writes from a stale tab. */
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accountsAvailable, setAccountsAvailable] = useState<boolean | null>(null);
  const generation = useRef(0);
  const deviceReports = useRef(new WeakMap<StudyReport, string>());
  const scope = useRef(0);
  const identity = useRef<string | null>(null);
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
    const request = ++generation.current;
    setLoading(true);
    try {
      const [status, techniques] = await Promise.all([
        api<{ configured: boolean }>("/auth/status"),
        api<StudyType[]>("/studytypes"),
      ]);
      const session = status.configured
        ? await api<{ user: User } | null>("/auth/get-session")
        : null;
      if (request !== generation.current) return;
      if (identity.current !== (session?.user.id || null)) {
        ++scope.current;
        identity.current = session?.user.id || null;
        if (mode === "server") setData(null);
      }
      setAccountScope(session?.user.id || null);
      setUser(session?.user || null);
      setAccountsAvailable(status.configured);
      setStudyTypes(techniques);
      if (mode === "device") {
        const seed = new DeviceWorkspace(localStorage).read();
        setData(seed.workspace);
      } else if (session) {
        const workspace = await api<Workspace>("/workspace/overview");
        if (request !== generation.current) return;
        setData(workspace);
      } else setData(null);
      setError("");
      setRefreshedAt(new Date());
    } catch (cause) {
      if (request === generation.current) {
        if (mode === "server") setData(null);
        // Device data stays available even if the public service is offline.
        else
          try {
            const saved = new DeviceWorkspace(localStorage).read();
            setData(saved.workspace);
            setStudyTypes(saved.studyTypes);
          } catch {
            /* Preserve the original connection error. */
          }
        setError(errorMessage(cause));
      }
      throw cause;
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [mode]);

  async function startDevice() {
    ++generation.current;
    ++scope.current;
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
    ++generation.current;
    ++scope.current;
    setLoading(true);
    setData(null);
    try {
      const [session, workspace, techniques] = await Promise.all([
        api<{ user: User } | null>("/auth/get-session"),
        api<Workspace>("/workspace/overview"),
        api<StudyType[]>("/studytypes"),
      ]);
      if (!session) throw new Error("Log in to open your account workspace.");
      identity.current = session.user.id;
      setAccountScope(session.user.id);
      rememberAccountMode();
      setData(workspace);
      setUser(session.user);
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

  async function authenticate(path: string, body: unknown) {
    ++generation.current;
    ++scope.current;
    const session = await api<{ user: User }>(path, "POST", body);
    // Registration/login has succeeded even if loading study data then fails.
    setUser(session.user);
    identity.current = session.user.id;
    setAccountScope(session.user.id);
    setData(null);
    setMode("server");
    rememberAccountMode();
    await connectServer();
    notifyAccountChange();
  }

  async function login(email: string, password: string) {
    await authenticate("/auth/sign-in/email", { email, password });
  }

  async function register(name: string, email: string, password: string) {
    await authenticate("/auth/sign-up/email", { name, email, password });
  }

  async function logout() {
    await api("/auth/sign-out", "POST", {});
    ++generation.current;
    ++scope.current;
    setUser(null);
    identity.current = null;
    setAccountScope(null);
    setData(null);
    setError("");
    setLoading(false);
    setMode("server");
    rememberAccountMode();
    notifyAccountChange();
  }

  useEffect(() => {
    const expire = () => {
      ++generation.current;
      ++scope.current;
      setUser(null);
      identity.current = null;
      setAccountScope(null);
      if (mode === "server") {
        setData(null);
        setError("Your session has ended. Log in again to open your saved workspace.");
      }
      setLoading(false);
    };
    window.addEventListener("methodica-session-expired", expire);
    return () => window.removeEventListener("methodica-session-expired", expire);
  }, [mode]);

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== "methodica-account-change") return;
      ++generation.current;
      ++scope.current;
      if (mode === "server") setData(null);
      setUser(null);
      setAccountScope(null);
      void reload().catch(() => {
        /* Connection banner shows errors. */
      });
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [mode, reload]);

  function checkScope(request: number) {
    if (request !== scope.current) throw new Error("Your workspace changed. Please try again.");
  }

  async function importDeviceWorkspace(workspace: Workspace, reviewToken: string) {
    if (mode !== "server" || !user)
      throw new Error("Open your account workspace before importing.");
    const request = scope.current;
    const result = await api<{ summary: ImportSummary; workspace: Workspace }>(
      "/workspace/import",
      "POST",
      { workspace, reviewToken }
    );
    checkScope(request);
    setData(result.workspace);
    setRefreshedAt(new Date());
    return result.summary;
  }

  async function getWorkspace() {
    return mode === "device"
      ? new DeviceWorkspace(localStorage).read().workspace
      : api<Workspace>("/workspace");
  }

  const getHistory = useCallback(
    async (params: HistoryQuery): Promise<HistoryPage> => {
      const request = scope.current;
      const search = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      );
      const result =
        mode === "device"
          ? historyPage(new DeviceWorkspace(localStorage).read().workspace.sessions, params)
          : await api<HistoryPage>(`/sessions/page?${search}`);
      checkScope(request);
      return result;
    },
    [mode]
  );

  const getSession = useCallback(
    async (id: string) => {
      const request = scope.current;
      const result =
        mode === "device"
          ? new DeviceWorkspace(localStorage).read().workspace.sessions.find((s) => s.id === id)
          : await api<SessionLog>(`/sessions/${encodeURIComponent(id)}`);
      checkScope(request);
      if (!result) throw new ApiError("Session not found.", 404);
      return result;
    },
    [mode]
  );

  const getReport = useCallback(
    async (days: number, timezone: string): Promise<StudyReport> => {
      const request = scope.current;
      const search = new URLSearchParams({ days: String(days), timezone });
      let result: StudyReport;
      if (mode === "device") {
        const sessions = new DeviceWorkspace(localStorage).read().workspace.sessions;
        result = studyReport(sessions, reportQuery(search));
        deviceReports.current.set(result, canonical(sessions));
      } else result = await api<StudyReport>(`/reports/summary?${search}`);
      checkScope(request);
      return result;
    },
    [mode]
  );

  const exportReport = useCallback(
    async (report: StudyReport) => {
      const request = scope.current;
      const params = new URLSearchParams({
        days: String(report.days),
        timezone: report.timezone,
        until: report.until,
        revision: String(report.revision),
      });
      let result: { csv: string };
      if (mode === "device") {
        const sessions = new DeviceWorkspace(localStorage).read().workspace.sessions;
        if (deviceReports.current.get(report) !== canonical(sessions))
          throw new Error("Your sessions changed. Refresh the report before exporting.");
        result = { csv: sessionsCsv(sessions.filter((s) => inReport(s, report))) };
      } else result = await api<{ csv: string }>(`/reports/sessions?${params}`);
      checkScope(request);
      return result.csv;
    },
    [mode]
  );

  function refreshDevice() {
    setData(new DeviceWorkspace(localStorage).read().workspace);
  }

  useEffect(() => {
    void reload().catch(() => {
      /* The connection banner presents the error. */
    });
  }, [reload]);

  async function saveFlow(flow: StudyFlow, isNew: boolean) {
    const request = scope.current;
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
    checkScope(request);
    setData(
      (prev) =>
        prev && { ...prev, flows: [saved, ...prev.flows.filter((item) => item.id !== saved.id)] }
    );
    return saved;
  }

  async function deleteFlow(id: string) {
    const request = scope.current;
    if (mode === "device") {
      new DeviceWorkspace(localStorage).deleteFlow(id);
      refreshDevice();
      return;
    }
    await api(`/flows/${encodeURIComponent(id)}`, "DELETE");
    checkScope(request);
    setData((prev) => prev && { ...prev, flows: prev.flows.filter((item) => item.id !== id) });
  }

  async function saveSession(session: NewSession) {
    const request = scope.current;
    if (mode === "device") {
      const saved = new DeviceWorkspace(localStorage).saveSession(session);
      refreshDevice();
      return saved;
    }
    const saved = await api<SessionLog>("/sessions", "POST", session);
    checkScope(request);
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
    const request = scope.current;
    if (mode === "device") {
      new DeviceWorkspace(localStorage).saveReflection(id, entry);
      refreshDevice();
      return;
    }
    const saved = await api<SessionLog>(`/sessions/${encodeURIComponent(id)}/log`, "PUT", entry);
    checkScope(request);
    setData(
      (prev) =>
        prev && {
          ...prev,
          sessions: [saved, ...prev.sessions.filter((session) => session.id !== id)],
        }
    );
  }

  async function importTemplate(id: string) {
    const request = scope.current;
    if (mode === "device") {
      new DeviceWorkspace(localStorage).importTemplate(id);
      refreshDevice();
      return;
    }
    const flow = await api<StudyFlow>(`/templates/${encodeURIComponent(id)}/import`, "POST");
    checkScope(request);
    setData(
      (prev) =>
        prev && { ...prev, flows: [flow, ...prev.flows.filter((item) => item.id !== flow.id)] }
    );
  }

  async function publishFlow(id: string, author: string) {
    const request = scope.current;
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
    checkScope(request);
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
        user,
        accountsAvailable,
        login,
        register,
        logout,
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
        importDeviceWorkspace,
        saveFlow,
        deleteFlow,
        saveSession,
        getHistory,
        getSession,
        getReport,
        exportReport,
        saveReflection,
        importTemplate,
        publishFlow,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
