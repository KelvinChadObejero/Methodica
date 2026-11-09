import type { SessionLog, Workspace } from "../types";
import {
  canonical,
  MAX_IMPORT_BYTES,
  validateImportWorkspace,
} from "../../../backend/src/workspace-import";

export const LEGACY_SESSIONS_KEY = "methodica-sessions";
export interface BackupSource {
  workspace: Workspace;
  legacy: boolean;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("This is not a supported Methodica backup.");
  return value as Record<string, unknown>;
}
async function stableId(prefix: string, value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
  return (
    prefix +
    Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}

async function legacyWorkspace(values: unknown[]): Promise<Workspace> {
  if (values.length > 5000) throw new Error("A backup can contain at most 5,000 sessions.");
  const seen = new Set<string>();
  const sessions: SessionLog[] = [];
  for (const value of values) {
    const record = object(value);
    if (
      typeof record.id !== "string" ||
      !record.id.trim() ||
      record.id.length > 120 ||
      seen.has(record.id)
    )
      throw new Error("A legacy record has a missing or duplicate ID. Nothing was imported.");
    if ("focusMinutes" in record || "status" in record || "flowId" in record)
      throw new Error("These session records need a complete versioned workspace backup.");
    seen.add(record.id);
    // The old timer saved planned durations, even on early finishes. Keep the
    // record, but do not turn that estimate into measured study time or a streak.
    sessions.push({
      ...record,
      id: await stableId("legacy-", record.id),
      flowId: await stableId("legacy-", [record.flowTitle, record.flowTag]),
      focusMinutes: 0,
      status: "stopped",
      timingSource: "legacy-estimate",
    } as SessionLog);
  }
  return validateImportWorkspace({ version: 1, flows: [], sessions, templates: [] });
}

export async function parseBackup(raw: string): Promise<BackupSource> {
  if (new TextEncoder().encode(raw).byteLength > MAX_IMPORT_BYTES - 1024)
    throw new Error(
      "The backup exceeds the 8 MB import limit. Your account and browser data were not changed."
    );
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("The file is not valid JSON. Choose a Methodica JSON backup.");
  }
  if (Array.isArray(value)) return { workspace: await legacyWorkspace(value), legacy: true };
  const envelope = object(value);
  if ("workspace" in envelope)
    return { workspace: validateImportWorkspace(envelope.workspace), legacy: false };
  if (envelope.version === 1)
    return { workspace: validateImportWorkspace(envelope), legacy: false };
  if (typeof envelope[LEGACY_SESSIONS_KEY] === "string") {
    let sessions: unknown;
    try {
      sessions = JSON.parse(envelope[LEGACY_SESSIONS_KEY]);
    } catch {
      throw new Error("The legacy sessions in this backup are not valid JSON.");
    }
    if (!Array.isArray(sessions)) throw new Error("Legacy sessions must be a list.");
    return { workspace: await legacyWorkspace(sessions), legacy: true };
  }
  throw new Error(
    "This backup format is not supported. Use a Methodica workspace export or legacy session list."
  );
}
