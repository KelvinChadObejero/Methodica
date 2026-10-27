import type { ReflectionEntry, SessionLog, StudyFlow, StudyType, Workspace } from "../types";

export const DEVICE_WORKSPACE_KEY = "methodica-device-workspace-v1";
export const WORKSPACE_MODE_KEY = "methodica-workspace-mode";
export interface DeviceSeed {
  workspace: Workspace;
  studyTypes: StudyType[];
}
type BrowserStorage = Pick<Storage, "getItem" | "setItem">;
type NewSession = Omit<SessionLog, "hasReflection" | "reflection">;

// Device mode is an explicit, isolated workspace. It never writes to the API or
// uploads existing browser data when an online workspace becomes available.
export class DeviceWorkspace {
  constructor(private readonly storage: BrowserStorage) {}

  initialize(seed: DeviceSeed): DeviceSeed {
    if (this.storage.getItem(DEVICE_WORKSPACE_KEY) !== null) return this.read();
    this.write(seed);
    return structuredClone(seed);
  }

  read(): DeviceSeed {
    const raw = this.storage.getItem(DEVICE_WORKSPACE_KEY);
    if (raw === null) throw new Error("No workspace is saved on this device yet.");
    let seed: DeviceSeed;
    try {
      seed = JSON.parse(raw) as DeviceSeed;
    } catch {
      throw new Error(
        "Your saved device workspace could not be read. It has not been reset or overwritten."
      );
    }
    if (
      !seed ||
      !seed.workspace ||
      seed.workspace.version !== 1 ||
      !Array.isArray(seed.workspace.flows) ||
      !Array.isArray(seed.workspace.sessions) ||
      !Array.isArray(seed.workspace.templates) ||
      !Array.isArray(seed.studyTypes)
    ) {
      throw new Error(
        "This device workspace has an unsupported format. It has not been reset or overwritten."
      );
    }
    return seed;
  }

  private write(seed: DeviceSeed) {
    try {
      this.storage.setItem(DEVICE_WORKSPACE_KEY, JSON.stringify(seed));
    } catch {
      throw new Error(
        "This browser could not save your study data. Storage may be full or blocked. Export your workspace before clearing any site data."
      );
    }
  }

  private update<T>(change: (data: Workspace) => T): T {
    const seed = this.read();
    const result = change(seed.workspace);
    this.write(seed);
    return result;
  }

  saveFlow(input: StudyFlow, isNew: boolean): StudyFlow {
    const title = input.title.trim();
    const tag = input.tag.trim();
    if (!title || title.length > 120 || !tag || tag.length > 60)
      throw new Error("Enter a flow name (up to 120 characters) and subject (up to 60).");
    if (
      input.blocks.length < 1 ||
      input.blocks.length > 20 ||
      !input.blocks.some((block) => block.type !== "break")
    )
      throw new Error("A flow needs 1–20 blocks, including at least one study block.");
    if (
      input.blocks.some(
        (block) =>
          !block.title.trim() ||
          block.title.trim().length > 120 ||
          !Number.isInteger(block.durationMinutes) ||
          block.durationMinutes < 1 ||
          block.durationMinutes > 120
      )
    )
      throw new Error("Each block needs a name and a whole-number duration from 1–120 minutes.");
    const totalMinutes = input.blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
    if (totalMinutes > 480) throw new Error("A flow cannot exceed 480 minutes.");
    return this.update((data) => {
      const index = data.flows.findIndex((flow) => flow.id === input.id);
      if (!isNew && index < 0)
        throw new Error("This flow no longer exists. Create a new copy instead.");
      if (isNew && data.flows.length >= 100) throw new Error("Your library is full (100 flows).");
      const saved = {
        ...structuredClone(input),
        id: isNew ? crypto.randomUUID() : input.id,
        title,
        tag,
        totalMinutes,
      };
      if (isNew) data.flows.unshift(saved);
      else data.flows[index] = saved;
      return saved;
    });
  }

  deleteFlow(id: string) {
    this.update((data) => {
      const index = data.flows.findIndex((flow) => flow.id === id);
      if (index < 0) throw new Error("Flow not found.");
      data.flows.splice(index, 1);
    });
  }

  saveSession(input: NewSession): SessionLog {
    if (
      !Number.isFinite(input.durationMinutes) ||
      input.durationMinutes < 1 / 60 ||
      input.durationMinutes > 480 ||
      !Number.isFinite(input.focusMinutes) ||
      input.focusMinutes < 0 ||
      input.focusMinutes > input.durationMinutes ||
      !Number.isFinite(Date.parse(input.startedAt))
    )
      throw new Error("This session has invalid timing information.");
    return this.update((data) => {
      const existing = data.sessions.find((session) => session.id === input.id);
      if (existing) {
        if (
          (Object.keys(input) as (keyof NewSession)[]).some((key) => existing[key] !== input[key])
        )
          throw new Error("Session ID already belongs to another session.");
        return existing;
      }
      if (data.sessions.length >= 5000)
        throw new Error("Workspace session limit reached. Export your data before continuing.");
      const saved = { ...input, hasReflection: false };
      data.sessions.unshift(saved);
      return saved;
    });
  }

  saveReflection(
    id: string,
    input: Pick<ReflectionEntry, "comprehension" | "fatigue" | "notes">
  ): SessionLog {
    if (
      ![input.comprehension, input.fatigue].every(
        (value) => Number.isInteger(value) && value >= 1 && value <= 5
      ) ||
      input.notes.length > 5000
    )
      throw new Error("Reflection ratings must be 1–5 and notes at most 5000 characters.");
    return this.update((data) => {
      const session = data.sessions.find((item) => item.id === id);
      if (!session) throw new Error("Session not found.");
      session.reflection = {
        ...input,
        notes: input.notes.trim(),
        sessionTitle: session.flowTitle,
        sessionSubtitle: `${session.subject} · ${session.durationMinutes.toFixed(1)} min`,
      };
      session.hasReflection = true;
      return session;
    });
  }

  importTemplate(id: string): StudyFlow {
    return this.update((data) => {
      const template = data.templates.find((item) => item.id === id);
      if (!template) throw new Error("Template not found.");
      const existing = data.flows.find((flow) => flow.sourceTemplateId === id);
      if (existing) return existing;
      if (data.flows.length >= 100) throw new Error("Your library is full (100 flows).");
      const flow: StudyFlow = {
        id: crypto.randomUUID(),
        title: template.title,
        tag: template.tag,
        totalMinutes: template.totalMinutes,
        blocks: template.blocks.map((block) => ({ ...block, id: crypto.randomUUID() })),
        sourceTemplateId: id,
      };
      data.flows.unshift(flow);
      return flow;
    });
  }

  publishFlow(id: string, author: string) {
    if (!author.trim() || author.trim().length > 60)
      throw new Error("Enter a display name of 1–60 characters.");
    this.update((data) => {
      const flow = data.flows.find((item) => item.id === id);
      if (!flow) throw new Error("Flow not found.");
      const template = {
        ...structuredClone(flow),
        id: `published-${id}`,
        author: author.trim(),
        sourceTemplateId: undefined,
      };
      data.templates = [template, ...data.templates.filter((item) => item.id !== template.id)];
    });
  }
}
