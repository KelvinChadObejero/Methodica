import type { StudyFlow } from "../types";

export interface FlowDraft {
  flow: StudyFlow;
  isNew: boolean;
}
export interface ReflectionDraft {
  comprehension: number;
  fatigue: number;
  notes: string;
}

export function draftKey(scope: string, kind: string) {
  return `methodica-draft-v1:${encodeURIComponent(scope)}:${kind}`;
}

export function readDraft<T>(key: string, validate: (value: unknown) => value is T): T | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) || "null");
    return validate(value) ? value : null;
  } catch {
    return null;
  }
}

// A draft is a same-tab recovery copy, never a successful API save.
export function writeDraft(key: string, value: unknown): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* The form still works without tab storage. */
  }
}

export function isFlowDraft(value: unknown): value is FlowDraft {
  if (!value || typeof value !== "object" || !("flow" in value) || !("isNew" in value))
    return false;
  const { flow, isNew } = value as FlowDraft;
  return (
    typeof isNew === "boolean" &&
    !!flow &&
    typeof flow.id === "string" &&
    typeof flow.title === "string" &&
    typeof flow.tag === "string" &&
    Array.isArray(flow.blocks) &&
    flow.blocks.length > 0 &&
    flow.blocks.length <= 20 &&
    flow.blocks.every(
      (block) =>
        !!block &&
        typeof block.id === "string" &&
        typeof block.title === "string" &&
        ["focus", "break", "review", "recall"].includes(block.type) &&
        Number.isFinite(block.durationMinutes) &&
        (block.studyTypeId === undefined || typeof block.studyTypeId === "string")
    )
  );
}

export function isReflectionDraft(value: unknown): value is ReflectionDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as ReflectionDraft;
  return (
    Number.isInteger(draft.comprehension) &&
    draft.comprehension >= 1 &&
    draft.comprehension <= 5 &&
    Number.isInteger(draft.fatigue) &&
    draft.fatigue >= 1 &&
    draft.fatigue <= 5 &&
    typeof draft.notes === "string" &&
    draft.notes.length <= 5000
  );
}
