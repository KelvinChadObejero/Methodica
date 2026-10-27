import { test } from "node:test";
import assert from "node:assert/strict";
import { finishRun, newRun, skipBlock, tick, toggleRun } from "../src/lib/timer";
import type { StudyFlow } from "../src/types";

const flow: StudyFlow = {
  id: "test",
  title: "Two study blocks and rest",
  tag: "Biology",
  totalMinutes: 4,
  blocks: [
    { id: "a", title: "Recall", type: "recall", durationMinutes: 1 },
    { id: "b", title: "Break", type: "break", durationMinutes: 1 },
    { id: "c", title: "Explain", type: "review", durationMinutes: 2 },
  ],
};
const start = Date.parse("2026-10-28T00:00:00Z");

test("a delayed tick advances multiple blocks and excludes breaks from focus time", () => {
  let run = toggleRun(newRun(flow), start);
  run = tick(run, start + 150000);
  assert.equal(run.blockIndex, 2);
  assert.equal(run.remainingMs, 90000);
  assert.equal(run.elapsedMs, 150000);
  assert.equal(run.focusMs, 90000);
  run = tick(run, start + 600000);
  assert.equal(run.completed, true);
  assert.equal(run.deadline, null);
  assert.equal(run.elapsedMs, 240000);
  assert.equal(run.focusMs, 180000);
  assert.deepEqual(tick(run, start + 999999), run);
});

test("pausing and resuming never count paused time", () => {
  let run = toggleRun(newRun(flow), start);
  run = toggleRun(run, start + 10000);
  assert.equal(run.remainingMs, 50000);
  assert.equal(run.elapsedMs, 10000);
  run = tick(run, start + 200000);
  assert.equal(run.elapsedMs, 10000);
  run = toggleRun(run, start + 200000);
  run = tick(run, start + 210000);
  assert.equal(run.remainingMs, 40000);
  assert.equal(run.elapsedMs, 20000);
});

test("manual breaks stop at the boundary even after a delayed tick", () => {
  let run = toggleRun(newRun(flow), start, false);
  run = tick(run, start + 200000, false);
  assert.equal(run.blockIndex, 1);
  assert.equal(run.deadline, null);
  assert.equal(run.elapsedMs, 60000);
  run = toggleRun(run, start + 300000, false);
  run = tick(run, start + 370000, false);
  assert.equal(run.blockIndex, 2);
  assert.equal(run.focusMs, 70000);
});

test("skipped blocks never count as completed study time", () => {
  let run = toggleRun(newRun(flow), start);
  run = skipBlock(run, start + 10000);
  assert.equal(run.blockIndex, 1);
  assert.equal(run.elapsedMs, 10000);
  assert.equal(run.skipped, true);
  run = finishRun(run, start + 20000);
  assert.equal(run.focusMs, 10000);
  assert.equal(run.elapsedMs, 20000);
  assert.equal(run.completed, true);
});

test("pausing after a delayed manual-break boundary does not start the break", () => {
  const run = toggleRun(newRun(flow), start, false);
  const paused = toggleRun(run, start + 65000, false);
  assert.equal(paused.blockIndex, 1);
  assert.equal(paused.deadline, null);
  assert.equal(paused.elapsedMs, 60000);
});

test("a serialized timer resumes from its original deadline after refresh", () => {
  const run = toggleRun(newRun(flow), start);
  const restored = JSON.parse(JSON.stringify(run));
  const later = tick(restored, start + 65000);
  assert.equal(later.id, run.id);
  assert.equal(later.blockIndex, 1);
  assert.equal(later.remainingMs, 55000);
  assert.equal(later.elapsedMs, 65000);
});

test("resetting a later block uses the first block and does not mutate the saved flow", () => {
  const original = structuredClone(flow);
  const advanced = tick(toggleRun(newRun(flow), start), start + 125000);
  const reset = newRun(advanced.flow);
  assert.equal(reset.blockIndex, 0);
  assert.equal(reset.remainingMs, 60000);
  assert.notEqual(reset.id, advanced.id);
  assert.deepEqual(flow, original);
});
