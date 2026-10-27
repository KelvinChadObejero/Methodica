import type { StudyFlow } from "../types";

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
  };
}

// Use deadlines, not interval counts: a delayed/background tick still measures wall time.
export function tick(run: TimerRun, now: number, autoStartBreaks = true): TimerRun {
  let next = { ...run };
  while (next.deadline !== null && !next.completed) {
    const remaining = Math.min(next.remainingMs, Math.max(0, next.deadline - now));
    const elapsed = next.remainingMs - remaining;
    next.elapsedMs += elapsed;
    if (next.flow.blocks[next.blockIndex].type !== "break") next.focusMs += elapsed;
    next.remainingMs = remaining;
    if (remaining > 0) break;
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
  return {
    ...next,
    deadline: now + next.remainingMs,
    startedAt: next.startedAt || new Date(now).toISOString(),
  };
}

export function skipBlock(run: TimerRun, now: number, autoStartBreaks = true) {
  const next = tick(run, now, autoStartBreaks);
  if (next.completed || next.blockIndex === next.flow.blocks.length - 1) return next;
  const blockIndex = next.blockIndex + 1;
  const duration = next.flow.blocks[blockIndex].durationMinutes * 60000;
  return {
    ...next,
    blockIndex,
    remainingMs: duration,
    skipped: true,
    deadline:
      next.deadline !== null && (autoStartBreaks || next.flow.blocks[blockIndex].type !== "break")
        ? now + duration
        : null,
  };
}

export function finishRun(run: TimerRun, now: number, autoStartBreaks = true) {
  return { ...tick(run, now, autoStartBreaks), deadline: null, completed: true, skipped: true };
}

export function restoreRun(): TimerRun | null {
  try {
    const run = JSON.parse(
      sessionStorage.getItem("methodica-active-timer") || "null"
    ) as TimerRun | null;
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
      (run.deadline !== null && !Number.isFinite(run.deadline)) ||
      (run.startedAt !== null && !Number.isFinite(Date.parse(run.startedAt)))
    )
      return null;
    return run;
  } catch {
    return null;
  }
}
