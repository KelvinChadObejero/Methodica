import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../src/lib/analytics";
import { sessionsCsv } from "../src/lib/export";
import type { SessionLog } from "../src/types";

const now = new Date(2026, 9, 28, 12);
function session(daysAgo: number, subject = "Biology"): SessionLog {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return {
    id: `session-${daysAgo}`,
    flowId: "flow",
    flowTitle: "Recall",
    flowTag: subject,
    subject,
    startedAt: date.toISOString(),
    durationMinutes: 30,
    focusMinutes: 25,
    status: "completed",
    hasReflection: false,
  };
}
test("analytics use saved sessions and filter ranges without counting rest time", () => {
  const result = summarize([session(0), session(1), session(2), session(20), session(40)], 7, now);
  assert.equal(result.selected.length, 3);
  assert.equal(result.focusMinutes, 75);
  assert.equal(result.streak, 3);
  assert.equal(
    result.daily.reduce((sum, day) => sum + day.minutes, 0),
    75
  );
  assert.equal(summarize([session(20)], 30, now).selected.length, 1);
});
test("yesterday can continue a streak and an older gap breaks it", () => {
  assert.equal(summarize([session(1), session(2), session(4)], 7, now).streak, 2);
  assert.equal(summarize([session(2), session(3)], 7, now).streak, 0);
  assert.equal(summarize([], 7, now).focusMinutes, 0);
  assert.deepEqual(summarize([], 7, now).subjects, []);
});
test("subject labels cannot collide with object prototype properties", () => {
  const result = summarize([session(0, "__proto__"), session(1, "constructor")], 7, now);
  assert.deepEqual(result.subjects, [
    ["__proto__", 25],
    ["constructor", 25],
  ]);
});
test("CSV preserves commas, quotes, line breaks, reflections and neutralizes formulas", () => {
  const record = session(0, '=HYPERLINK("bad")');
  record.hasReflection = true;
  record.reflection = {
    sessionTitle: "Recall",
    sessionSubtitle: "",
    comprehension: 4,
    fatigue: 2,
    notes: 'A, B and "C"\nNext line',
  };
  const csv = sessionsCsv([record]);
  assert(csv.includes(`"'=HYPERLINK(""bad"")"`));
  assert(csv.includes('"A, B and ""C""\nNext line"'));
  assert(csv.includes('"4","2"'));
});
