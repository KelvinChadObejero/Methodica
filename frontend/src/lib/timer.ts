import type { SessionExecution, StudyFlow } from "../types";

export interface TimerRun {
  id: string;
  flow: StudyFlow;
  blockIndex: number;
  remainingMs: number;
  deadline: number | null;
  elapsedMs: number;
  focusMs: number;
  startedAt: string | null;
  completed: boolean;
  skipped: boolean;
  execution?: SessionExecution;
  recovered?: boolean;
}

export function newRun(flow: StudyFlow): TimerRun {
  return {
    id: crypto.randomUUID(),
    flow: structuredClone(flow),
    blockIndex: 0,
    remainingMs: flow.blocks[0].durationMinutes * 60000,
    deadline: null,
    elapsedMs: 0,
    focusMs: 0,
    startedAt: null,
    completed: false,
    skipped: false,
    execution: {
      version: 1,
      blocks: flow.blocks.map((block) => ({
        blockId: block.id,
        elapsedMs: 0,
        outcome: "not-started",
      })),
      events: [],
    },
  };
}

// Monotonic epoch timestamps are immune to Date.now/system clock adjustments.
export function timerNow() {
  return Math.floor(performance.timeOrigin + performance.now());
}
function copy(run: TimerRun): TimerRun {
  return { ...run, ...(run.execution ? { execution: structuredClone(run.execution) } : {}) };
}
function started(run: TimerRun) {
  const row = run.execution?.blocks[run.blockIndex];
  if (row?.outcome === "not-started") {
    row.outcome = "running";
    run.execution!.events.push({ blockId: row.blockId, type: "started", atMs: run.elapsedMs });
  }
}
function ended(run: TimerRun, type: "completed" | "skipped" | "stopped") {
  const row = run.execution?.blocks[run.blockIndex];
  if (!row || (row.outcome === "not-started" && type === "stopped")) return;
  started(run);
  row.outcome = type;
  run.execution!.events.push({ blockId: row.blockId, type, atMs: run.elapsedMs });
}

// Deadlines catch up over delayed/background callbacks without counting ticks.
export function tick(run: TimerRun, now: number, autoStartBreaks = true): TimerRun {
  let next = copy(run);
  while (next.deadline !== null && !next.completed) {
    started(next);
    const remaining = Math.min(next.remainingMs, Math.max(0, next.deadline - now));
    const elapsed = next.remainingMs - remaining;
    next.elapsedMs += elapsed;
    if (next.execution) next.execution.blocks[next.blockIndex].elapsedMs += elapsed;
    if (next.flow.blocks[next.blockIndex].type !== "break") next.focusMs += elapsed;
    next.remainingMs = remaining;
    if (remaining > 0) break;
    ended(next, "completed");
    if (next.blockIndex === next.flow.blocks.length - 1) {
      next = { ...next, completed: true, deadline: null };
      break;
    }
    const blockIndex = next.blockIndex + 1;
    const block = next.flow.blocks[blockIndex];
    const duration = block.durationMinutes * 60000;
    next = {
      ...next,
      blockIndex,
      remainingMs: duration,
      deadline: !autoStartBreaks && block.type === "break" ? null : next.deadline + duration,
    };
  }
  return next;
}

export function toggleRun(run: TimerRun, now: number, autoStartBreaks = true) {
  const next = tick(run, now, autoStartBreaks);
  if (next.completed) return next;
  if (run.deadline !== null) return { ...next, deadline: null };
  started(next);
  return {
    ...next,
    recovered: false,
    deadline: now + next.remainingMs,
    startedAt: next.startedAt || new Date(now).toISOString(),
  };
}

export function skipBlock(run: TimerRun, now: number, autoStartBreaks = true) {
  const next = tick(run, now, autoStartBreaks);
  if (next.completed || next.blockIndex === next.flow.blocks.length - 1) return next;
  ended(next, "skipped");
  const blockIndex = next.blockIndex + 1;
  const duration = next.flow.blocks[blockIndex].durationMinutes * 60000;
  const result = {
    ...next,
    blockIndex,
    remainingMs: duration,
    skipped: true,
    deadline:
      next.deadline !== null && (autoStartBreaks || next.flow.blocks[blockIndex].type !== "break")
        ? now + duration
        : null,
  };
  if (result.deadline !== null) started(result);
  return result;
}

export function finishRun(run: TimerRun, now: number, autoStartBreaks = true) {
  const next = tick(run, now, autoStartBreaks);
  if (next.completed) return next;
  ended(next, "stopped");
  return { ...next, deadline: null, completed: true, skipped: true };
}

export function recoverRun(value: unknown): TimerRun | null {
  const run = value as TimerRun | null;
  if (
    !run ||
    typeof run.id !== "string" ||
    !run.flow?.blocks?.length ||
    !Number.isInteger(run.blockIndex) ||
    run.blockIndex < 0 ||
    run.blockIndex >= run.flow.blocks.length ||
    !Number.isFinite(run.remainingMs) ||
    run.remainingMs < 0 ||
    !Number.isFinite(run.elapsedMs) ||
    run.elapsedMs < 0 ||
    !Number.isFinite(run.focusMs) ||
    run.focusMs < 0 ||
    run.focusMs > run.elapsedMs ||
    !Array.isArray(run.flow.blocks) ||
    !run.flow.blocks.every(
      (block) =>
        block &&
        typeof block.id === "string" &&
        typeof block.title === "string" &&
        ["focus", "break", "review", "recall"].includes(block.type) &&
        Number.isInteger(block.durationMinutes) &&
        block.durationMinutes >= 1 &&
        block.durationMinutes <= 120
    ) ||
    run.remainingMs > run.flow.blocks[run.blockIndex].durationMinutes * 60000 ||
    (run.deadline !== null && !Number.isFinite(run.deadline)) ||
    (run.startedAt !== null && !Number.isFinite(Date.parse(run.startedAt)))
  )
    return null;
  if (run.execution) {
    const execution = run.execution;
    if (
      execution.version !== 1 ||
      !Array.isArray(execution.blocks) ||
      execution.blocks.length !== run.flow.blocks.length ||
      !Array.isArray(execution.events) ||
      execution.events.length > 40 ||
      !execution.blocks.every(
        (row, index) =>
          row &&
          row.blockId === run.flow.blocks[index].id &&
          Number.isInteger(row.elapsedMs) &&
          row.elapsedMs >= 0 &&
          row.elapsedMs <= run.flow.blocks[index].durationMinutes * 60000 &&
          ["not-started", "running", "completed", "skipped", "stopped"].includes(row.outcome)
      ) ||
      execution.blocks.reduce((sum, row) => sum + row.elapsedMs, 0) !== run.elapsedMs ||
      execution.blocks.reduce(
        (sum, row, index) => sum + (run.flow.blocks[index].type === "break" ? 0 : row.elapsedMs),
        0
      ) !== run.focusMs ||
      !execution.events.every(
        (event) =>
          event &&
          ["started", "completed", "skipped", "stopped"].includes(event.type) &&
          Number.isInteger(event.atMs) &&
          event.atMs >= 0 &&
          event.atMs <= run.elapsedMs &&
          run.flow.blocks.some((block) => block.id === event.blockId)
      )
    )
      return null;
  }
  // Do not credit uncertain time while the page was closed or reloaded.
  return { ...run, deadline: null, recovered: !run.completed };
}
export function restoreRun(storageKey = "methodica-active-timer"): TimerRun | null {
  try {
    return recoverRun(JSON.parse(sessionStorage.getItem(storageKey) || "null"));
  } catch {
    return null;
  }
}
