import type { Workspace, StudyFlow, StudyFlowTemplate, SessionLog } from "./domain.js";
import { studyTypes } from "./seed.js";

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
export class WorkspaceImportError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new WorkspaceImportError("The device workspace contains an invalid record.");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new WorkspaceImportError(`${label} must contain 1–${max} characters.`);
  return value.trim();
}
function id(value: unknown, label: string, max = 80): string {
  const result = text(value, label, max);
  if (result !== value || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(result))
    throw new WorkspaceImportError(`${label} is not a supported record ID.`);
  return result;
}
function number(value: unknown, label: string, min: number, max: number, integer = false): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new WorkspaceImportError(
      `${label} must be ${integer ? "a whole number " : ""}between ${min} and ${max}.`
    );
  return value;
}
function list(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new WorkspaceImportError(`${label} must be a list of at most ${max} records.`);
  return value;
}
function unique<T extends { id: string }>(values: T[], label: string): T[] {
  if (new Set(values.map((value) => value.id)).size !== values.length)
    throw new WorkspaceImportError(`${label} contains duplicate IDs. No data was imported.`);
  return values;
}
function flow(value: unknown, template = false): StudyFlow {
  const input = record(value);
  const blocks = unique(
    list(input.blocks, "Flow blocks", 20).map((value) => {
      const block = record(value);
      if (!["focus", "break", "review", "recall"].includes(String(block.type)))
        throw new WorkspaceImportError("A block has an unknown type.");
      const technique =
        block.studyTypeId === undefined
          ? undefined
          : studyTypes.find((item) => item.id === block.studyTypeId);
      if (block.studyTypeId !== undefined && (!technique || technique.type !== block.type))
        throw new WorkspaceImportError("A block's technique does not match its type.");
      return {
        id: id(block.id, "Block ID"),
        title: text(block.title, "Block name", 120),
        type: block.type as "focus" | "break" | "review" | "recall",
        durationMinutes: number(block.durationMinutes, "Block duration", 1, 120, true),
        ...(technique ? { studyTypeId: technique.id } : {}),
      };
    }),
    "Flow blocks"
  );
  if (!blocks.some((block) => block.type !== "break"))
    throw new WorkspaceImportError("Every flow needs at least one study block.");
  const totalMinutes = blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  if (totalMinutes > 480) throw new WorkspaceImportError("A flow cannot exceed 480 minutes.");
  return {
    id: id(input.id, template ? "Template ID" : "Flow ID", template ? 100 : 80),
    title: text(input.title, "Flow name", 120),
    tag: text(input.tag, "Subject", 60),
    blocks,
    totalMinutes,
    ...(input.sourceTemplateId === undefined
      ? {}
      : { sourceTemplateId: id(input.sourceTemplateId, "Source template ID", 100) }),
  };
}
function session(value: unknown): SessionLog {
  const input = record(value);
  const started = Date.parse(text(input.startedAt, "Session start", 120));
  if (!Number.isFinite(started) || started > Date.now() + 5000)
    throw new WorkspaceImportError("Session start must be a valid past date.");
  const durationMinutes = number(input.durationMinutes, "Session duration", 1 / 60, 480);
  if (durationMinutes * 60000 > Date.now() - started + 5000)
    throw new WorkspaceImportError("A session's duration exceeds its elapsed time.");
  if (input.status !== "completed" && input.status !== "stopped")
    throw new WorkspaceImportError("A session has an unknown completion status.");
  if (
    typeof input.hasReflection !== "boolean" ||
    input.hasReflection !== (input.reflection !== undefined)
  )
    throw new WorkspaceImportError("A session's reflection information is incomplete.");
  const entry: SessionLog = {
    id: id(input.id, "Session ID"),
    flowId: id(input.flowId, "Session flow ID"),
    flowTitle: text(input.flowTitle, "Session flow name", 120),
    flowTag: text(input.flowTag, "Session flow subject", 60),
    subject: text(input.subject, "Session subject", 60),
    startedAt: new Date(started).toISOString(),
    durationMinutes,
    focusMinutes: number(input.focusMinutes, "Focus time", 0, durationMinutes),
    status: input.status,
    hasReflection: input.hasReflection,
  };
  if (input.hasReflection) {
    const reflection = record(input.reflection);
    if (typeof reflection.notes !== "string" || reflection.notes.length > 5000)
      throw new WorkspaceImportError("Reflection notes must contain at most 5000 characters.");
    entry.reflection = {
      sessionTitle: entry.flowTitle,
      sessionSubtitle: `${entry.subject} · ${entry.durationMinutes.toFixed(1)} min`,
      comprehension: number(reflection.comprehension, "Comprehension", 1, 5, true),
      fatigue: number(reflection.fatigue, "Fatigue", 1, 5, true),
      notes: reflection.notes,
    };
  }
  return entry;
}

export function validateImportWorkspace(value: unknown): Workspace {
  const input = record(value);
  if (input.version !== 1)
    throw new WorkspaceImportError("This workspace version is not supported.");
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_IMPORT_BYTES - 1024)
    throw new WorkspaceImportError(
      "This device workspace is too large to import at once (8 MB). Export a backup in Settings; your data has not been changed.",
      413
    );
  return {
    version: 1,
    flows: unique(
      list(input.flows, "Flows", 100).map((value) => flow(value)),
      "Flows"
    ),
    sessions: unique(list(input.sessions, "Sessions", 5000).map(session), "Sessions"),
    templates: unique(
      list(input.templates, "Templates", 200).map((value) => {
        const template = record(value);
        return { ...flow(value, true), author: text(template.author, "Template author", 60) };
      }),
      "Templates"
    ),
  };
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .filter((key) => obj[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(obj[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export interface ImportCounts {
  flows: number;
  sessions: number;
  templates: number;
}
export interface ImportConflict {
  kind: "flows" | "sessions" | "templates";
  title: string;
}
export interface ImportSummary {
  added: ImportCounts;
  existing: ImportCounts;
  conflicts: ImportConflict[];
  reflections: number;
}
export interface ImportReview extends ImportSummary {
  source: Workspace;
  token: string;
}
export function hasImportAdditions(summary: ImportSummary) {
  return Object.values(summary.added).some((count) => count > 0);
}

function comparableSession(value: SessionLog) {
  // Labels are derived differently by older adapters; ratings and notes matter.
  return {
    ...value,
    reflection: value.reflection
      ? {
          comprehension: value.reflection.comprehension,
          fatigue: value.reflection.fatigue,
          notes: value.reflection.notes,
        }
      : undefined,
  };
}

export function planWorkspaceImport(target: Workspace, source: Workspace) {
  const summary: ImportSummary = {
    added: { flows: 0, sessions: 0, templates: 0 },
    existing: { flows: 0, sessions: 0, templates: 0 },
    conflicts: [],
    reflections: 0,
  };
  const merged = structuredClone(target);
  function merge<T extends StudyFlow | StudyFlowTemplate | SessionLog>(
    kind: "flows" | "sessions" | "templates",
    incoming: T[],
    current: T[],
    maximum: number
  ): T[] {
    const byId = new Map(current.map((item) => [item.id, item]));
    const additions: T[] = [];
    for (const item of incoming) {
      const existing = byId.get(item.id);
      if (existing) {
        summary.existing[kind]++;
        const left = kind === "sessions" ? comparableSession(existing as SessionLog) : existing;
        const right = kind === "sessions" ? comparableSession(item as SessionLog) : item;
        if (canonical(left) !== canonical(right))
          summary.conflicts.push({ kind, title: "title" in item ? item.title : item.flowTitle });
      } else {
        additions.push(structuredClone(item));
        summary.added[kind]++;
        if (kind === "sessions" && (item as SessionLog).hasReflection) summary.reflections++;
      }
    }
    if (current.length + additions.length > maximum)
      throw new WorkspaceImportError(
        `The account would exceed its ${maximum}-${kind} limit. No records were imported.`,
        409
      );
    return [...additions, ...current];
  }
  merged.flows = merge("flows", source.flows, merged.flows, 100);
  merged.sessions = merge("sessions", source.sessions, merged.sessions, 5000);
  merged.templates = merge("templates", source.templates, merged.templates, 200);
  return { summary, merged };
}

export async function reviewWorkspaceImport(
  target: Workspace,
  input: unknown,
  accountId: string
): Promise<ImportReview> {
  const source = validateImportWorkspace(input);
  const { summary } = planWorkspaceImport(target, source);
  const bytes = new TextEncoder().encode(
    canonical({ operation: "methodica-device-import-v1", accountId, target, source })
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const token = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return { ...summary, source, token };
}
