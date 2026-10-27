import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { FileStore } from "./store.js";
import { initialWorkspace, studyTypes } from "./seed.js";
import type { SessionLog, StudyBlock, StudyFlow } from "./domain.js";

class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(400, "Expected a JSON object.");
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max = 120): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new HttpError(400, `${label} must be 1–${max} characters.`);
  return value.trim();
}

function number(value: unknown, label: string, min: number, max: number, integer = false): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new HttpError(
      400,
      `${label} must be ${integer ? "an integer " : ""}between ${min} and ${max}.`
    );
  return value;
}

function flowInput(body: unknown): Omit<StudyFlow, "id"> {
  const input = object(body);
  if (!Array.isArray(input.blocks) || input.blocks.length < 1 || input.blocks.length > 20)
    throw new HttpError(400, "A flow needs 1–20 blocks.");
  const blocks: StudyBlock[] = input.blocks.map((value) => {
    const block = object(value);
    if (!["focus", "break", "review", "recall"].includes(String(block.type)))
      throw new HttpError(400, "Unknown block type.");
    const technique =
      block.studyTypeId === undefined
        ? undefined
        : studyTypes.find((item) => item.id === block.studyTypeId);
    if (block.studyTypeId !== undefined && (!technique || technique.type !== block.type))
      throw new HttpError(400, "StudyType does not match the block type.");
    return {
      id: randomUUID(),
      title: text(block.title, "Block title"),
      type: block.type as StudyBlock["type"],
      durationMinutes: number(block.durationMinutes, "Block duration", 1, 120, true),
      ...(technique ? { studyTypeId: technique.id } : {}),
    };
  });
  if (!blocks.some((block) => block.type !== "break"))
    throw new HttpError(400, "Include at least one study block.");
  const totalMinutes = blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  if (totalMinutes > 480) throw new HttpError(400, "A flow cannot exceed 480 minutes.");
  return {
    title: text(input.title, "Flow title"),
    tag: text(input.tag, "Subject", 60),
    blocks,
    totalMinutes,
  };
}

export function createApp(options: { dataFile?: string } = {}) {
  const app = express();
  const store = new FileStore(
    options.dataFile || process.env.DATA_FILE || resolve("data/workspace.json")
  );
  app.disable("x-powered-by");
  app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:5173" }));
  app.use(express.json({ limit: "256kb" }));
  app.get(["/health", "/api/health"], (_req, res) =>
    res.json({
      status: "ok",
      service: "methodica-backend",
      storage: process.env.VERCEL && !options.dataFile ? "unconfigured" : "local-file",
    })
  );
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  // These endpoints contain only the public catalog and starter content. They
  // remain available without a database; private workspace routes fail closed.
  app.get("/api/studytypes", (_req, res) => res.json(studyTypes));
  app.get("/api/preview", (_req, res) => res.json({ workspace: initialWorkspace(), studyTypes }));
  app.use("/api", (_req, _res, next) => {
    if (process.env.VERCEL && !options.dataFile)
      return next(
        new HttpError(
          503,
          "Persistent database storage is required for hosted workspaces. Run the API locally for now."
        )
      );
    next();
  });
  app.get("/api/workspace", (_req, res) => res.json(store.read()));
  app.get("/api/flows", (_req, res) => res.json(store.read().flows));
  app.post("/api/flows", (req, res) => {
    const flow: StudyFlow = { id: randomUUID(), ...flowInput(req.body) };
    store.update((data) => {
      if (data.flows.length >= 100)
        throw new HttpError(409, "Your library is full (100 flows). Remove an unused flow first.");
      data.flows.unshift(flow);
    });
    res.status(201).json(flow);
  });
  app.put("/api/flows/:id", (req, res) => {
    const input = flowInput(req.body);
    const flow = store.update((data) => {
      const index = data.flows.findIndex((item) => item.id === req.params.id);
      if (index < 0) throw new HttpError(404, "Flow not found.");
      data.flows[index] = { ...data.flows[index], ...input };
      return data.flows[index];
    });
    res.json(flow);
  });
  app.delete("/api/flows/:id", (req, res) => {
    store.update((data) => {
      const index = data.flows.findIndex((item) => item.id === req.params.id);
      if (index < 0) throw new HttpError(404, "Flow not found.");
      data.flows.splice(index, 1);
    });
    res.status(204).end();
  });
  app.get("/api/sessions", (_req, res) => res.json(store.read().sessions));
  app.post("/api/sessions", (req, res) => {
    const input = object(req.body);
    const id = text(input.id, "Session ID", 80);
    const flowId = text(input.flowId, "Flow ID", 80);
    const startedAt = text(input.startedAt, "Start time");
    const started = Date.parse(startedAt);
    if (!Number.isFinite(started) || started > Date.now() + 5000)
      throw new HttpError(400, "Start time must be a valid past date.");
    const durationMinutes = number(input.durationMinutes, "Session duration", 1 / 60, 480);
    const focusMinutes = number(input.focusMinutes, "Focus time", 0, durationMinutes);
    if (durationMinutes * 60000 > Date.now() - started + 5000)
      throw new HttpError(400, "Duration exceeds elapsed time.");
    if (input.status !== "completed" && input.status !== "stopped")
      throw new HttpError(400, "Unknown session status.");
    const flowTitle = text(input.flowTitle, "Flow title");
    const flowTag = text(input.flowTag, "Flow subject", 60);
    const subject = text(input.subject, "Subject", 60);
    let created = false;
    const session = store.update((data) => {
      const existing = data.sessions.find((item) => item.id === id);
      if (existing) {
        if (
          existing.flowId !== flowId ||
          existing.startedAt !== new Date(started).toISOString() ||
          existing.durationMinutes !== durationMinutes ||
          existing.focusMinutes !== focusMinutes ||
          existing.status !== input.status ||
          existing.subject !== subject ||
          existing.flowTitle !== flowTitle ||
          existing.flowTag !== flowTag
        )
          throw new HttpError(409, "Session ID already belongs to another session.");
        return existing;
      }
      if (data.sessions.length >= 5000)
        throw new HttpError(
          409,
          "Workspace session limit reached. Export your data before continuing."
        );
      const entry: SessionLog = {
        id,
        flowId,
        flowTitle,
        flowTag,
        subject,
        startedAt: new Date(started).toISOString(),
        durationMinutes,
        focusMinutes,
        status: input.status as SessionLog["status"],
        hasReflection: false,
      };
      data.sessions.unshift(entry);
      created = true;
      return entry;
    });
    res.status(created ? 201 : 200).json(session);
  });
  app.put("/api/sessions/:id/log", (req, res) => {
    const input = object(req.body);
    const comprehension = number(input.comprehension, "Comprehension", 1, 5, true);
    const fatigue = number(input.fatigue, "Fatigue", 1, 5, true);
    if (typeof input.notes !== "string" || input.notes.length > 5000)
      throw new HttpError(400, "Notes must be text up to 5000 characters.");
    const notes = input.notes.trim();
    const entry = store.update((data) => {
      const session = data.sessions.find((item) => item.id === req.params.id);
      if (!session) throw new HttpError(404, "Session not found.");
      session.reflection = {
        sessionTitle: session.flowTitle,
        sessionSubtitle: `${session.subject} · ${Math.round(session.durationMinutes)} min`,
        comprehension,
        fatigue,
        notes,
      };
      session.hasReflection = true;
      return session;
    });
    res.json(entry);
  });
  app.post("/api/templates/:id/import", (req, res) => {
    const flow = store.update((data) => {
      const template = data.templates.find((item) => item.id === req.params.id);
      if (!template) throw new HttpError(404, "Template not found.");
      const existing = data.flows.find((item) => item.sourceTemplateId === template.id);
      if (existing) return existing;
      if (data.flows.length >= 100) throw new HttpError(409, "Your library is full (100 flows).");
      const imported: StudyFlow = {
        id: randomUUID(),
        title: template.title,
        tag: template.tag,
        totalMinutes: template.totalMinutes,
        blocks: template.blocks.map((block) => ({ ...block, id: randomUUID() })),
        sourceTemplateId: template.id,
      };
      data.flows.unshift(imported);
      return imported;
    });
    res.json(flow);
  });
  app.post("/api/flows/:id/publish", (req, res) => {
    const author = text(object(req.body).author, "Author", 60);
    const template = store.update((data) => {
      const flow = data.flows.find((item) => item.id === req.params.id);
      if (!flow) throw new HttpError(404, "Flow not found.");
      const id = `published-${flow.id}`;
      const published = { ...flow, id, author, sourceTemplateId: undefined };
      const index = data.templates.findIndex((item) => item.id === id);
      if (index < 0) data.templates.unshift(published);
      else data.templates[index] = published;
      return published;
    });
    res.json(template);
  });
  app.use((_req, _res, next) => next(new HttpError(404, "Endpoint not found.")));
  const onError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof HttpError) res.status(error.status).json({ message: error.message });
    else if (error instanceof SyntaxError && "body" in error)
      res.status(400).json({ message: "Invalid JSON body." });
    else if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      error.type === "entity.too.large"
    )
      res.status(413).json({ message: "Request body is too large." });
    else {
      console.error(error);
      res.status(500).json({
        message:
          "The workspace could not be read or saved. Check the API terminal and data file; your existing data has not been reset.",
      });
    }
  };
  app.use(onError);
  return app;
}
