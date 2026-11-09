import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBackup } from "../src/lib/backup-import";
import { initialWorkspace } from "../../backend/src/seed";
import { summarize } from "../src/lib/analytics";

const legacy = {
  id: "original-session-1",
  flowTitle: "Old timer flow",
  flowTag: "Biology",
  subject: "Biology",
  startedAt: new Date(Date.now() - 3600000).toISOString(),
  durationMinutes: 25,
  hasReflection: true,
  reflection: {
    sessionTitle: "Old flow",
    sessionSubtitle: "Old label",
    comprehension: 4,
    fatigue: 2,
    notes: "Original private notes",
  },
};

test("workspace JSON exports restore only validated study records, independent of envelope preferences", async () => {
  const workspace = initialWorkspace();
  const original = structuredClone(workspace);
  for (const payload of [
    workspace,
    { exportedAt: new Date().toISOString(), workspace, preferences: { role: "admin" } },
    { workspace, studyTypes: [] },
  ]) {
    const source = await parseBackup(JSON.stringify(payload));
    assert.equal(source.legacy, false);
    assert.deepEqual(source.workspace, original);
    assert.deepEqual(Object.keys(source).sort(), ["legacy", "workspace"]);
  }
  assert.deepEqual(workspace, original);
});

test("legacy IDs stay stable across browser and backup imports without crediting unmeasured study time", async () => {
  const source = await parseBackup(JSON.stringify([legacy]));
  const wrapped = await parseBackup(
    JSON.stringify({ "methodica-sessions": JSON.stringify([legacy]), "unrelated-app": "ignore" })
  );
  assert.deepEqual(source, wrapped);
  const record = source.workspace.sessions[0];
  assert.equal(source.legacy, true);
  assert.match(record.id, /^legacy-[a-f0-9]{64}$/);
  assert.equal(record.focusMinutes, 0);
  assert.equal(record.durationMinutes, 25);
  assert.equal(record.status, "stopped");
  assert.equal(record.timingSource, "legacy-estimate");
  assert.equal(record.reflection?.notes, legacy.reflection.notes);
  assert.equal(source.workspace.flows.length, 0);
  const summary = summarize(source.workspace.sessions, 7);
  assert.equal(summary.focusMinutes, 0);
  assert.equal(summary.completed, 0);
  assert.equal(summary.streak, 0);
  const changed = await parseBackup(
    JSON.stringify([
      { ...legacy, reflection: { ...legacy.reflection, notes: "A different version" } },
    ])
  );
  assert.equal(changed.workspace.sessions[0].id, record.id);
});

test("malformed, ambiguous, duplicate and oversized backups reject the whole import", async () => {
  for (const payload of [
    null,
    { version: 2, flows: [], sessions: [], templates: [] },
    [null],
    [legacy, legacy],
    [{ ...legacy, focusMinutes: 25 }],
    [{ ...legacy, hasReflection: true, reflection: undefined }],
    [{ ...legacy, durationMinutes: -1 }],
    { "methodica-sessions": "bad JSON" },
  ])
    await assert.rejects(parseBackup(JSON.stringify(payload)));
  await assert.rejects(parseBackup("id,flow,duration\n1,old,25"), /valid JSON/);
  await assert.rejects(parseBackup(" ".repeat(4 * 1024 * 1024)), /4 MB/);
  const forged = initialWorkspace();
  forged.sessions = [
    {
      ...legacy,
      flowId: "flow",
      focusMinutes: 25,
      status: "completed",
      timingSource: "legacy-estimate",
    },
  ];
  await assert.rejects(parseBackup(JSON.stringify(forged)), /cannot claim/);
});
