import type { SessionLog } from "./domain.js";
import { WorkspaceImportError } from "./workspace-import.js";

export interface HistoryQuery {
  q: string;
  subject: string;
  reflected: boolean;
  offset: number;
  limit: number;
  revision?: number;
}
export interface HistoryPage {
  items: SessionLog[];
  total: number;
  subjects: string[];
  nextOffset: number | null;
  revision: number;
}
export function historyQuery(params: URLSearchParams): HistoryQuery {
  function integer(name: string, fallback: number, max: number) {
    const raw = params.get(name);
    if (raw === null) return fallback;
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > max)
      throw new WorkspaceImportError(`Invalid ${name}.`);
    return Number(raw);
  }
  const q = (params.get("q") || "").trim();
  const subject = params.get("subject") || "";
  const reflected = params.get("reflected") || "false";
  if (q.length > 120 || subject.length > 60 || !["true", "false"].includes(reflected))
    throw new WorkspaceImportError("Invalid history filters.");
  const limit = integer("limit", 25, 100);
  if (!limit) throw new WorkspaceImportError("History limit must be at least 1.");
  return {
    q,
    subject,
    reflected: reflected === "true",
    offset: integer("offset", 0, 5000),
    limit,
    ...(params.has("revision") ? { revision: integer("revision", 0, 2147483647) } : {}),
  };
}
export function historyPage(
  sessions: SessionLog[],
  query: HistoryQuery,
  revision = 0
): HistoryPage {
  const matching = sessions
    .filter(
      (s) =>
        (!query.subject || s.subject === query.subject) &&
        (!query.reflected || s.hasReflection) &&
        [s.flowTitle, s.subject, s.reflection?.notes || ""].some((v) =>
          v.toLowerCase().includes(query.q.toLowerCase())
        )
    )
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || b.id.localeCompare(a.id));
  const end = query.offset + query.limit;
  return {
    items: matching.slice(query.offset, end),
    total: matching.length,
    subjects: [...new Set(sessions.map((s) => s.subject))].sort(),
    nextOffset: end < matching.length ? end : null,
    revision,
  };
}
