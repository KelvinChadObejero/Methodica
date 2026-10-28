import { test } from "node:test";
import assert from "node:assert/strict";
import { initialWorkspace } from "../src/seed.js";
import {
  canonical,
  planWorkspaceImport,
  reviewWorkspaceImport,
  validateImportWorkspace,
} from "../src/workspace-import.js";
import type { Workspace } from "../src/domain.js";

function device(): Workspace {
  const workspace = initialWorkspace();
  workspace.flows.unshift({
    ...structuredClone(workspace.flows[0]),
    id: "device-flow",
    title: "Device flow",
  });
  workspace.templates.unshift({
    ...structuredClone(workspace.flows[0]),
    id: "device-template",
    author: "Device author",
  });
  workspace.sessions.push({
    id: "device-session",
    flowId: "device-flow",
    flowTitle: "Device flow",
    flowTag: "General",
    subject: "General",
    startedAt: new Date(Date.now() - 120000).toISOString(),
    durationMinutes: 1,
    focusMinutes: 1,
    status: "stopped",
    hasReflection: true,
    reflection: {
      sessionTitle: "Old label",
      sessionSubtitle: "Old subtitle",
      comprehension: 4,
      fatigue: 2,
      notes: "Private device notes",
    },
  });
  return workspace;
}

test("import preserves existing records, snapshots, browser data and stable IDs", () => {
  const target = initialWorkspace();
  const source = device();
  const before = structuredClone(source);
  const planned = planWorkspaceImport(target, validateImportWorkspace(source));
  assert.deepEqual(planned.summary.added, { flows: 1, sessions: 1, templates: 1 });
  assert.equal(planned.merged.templates[0].author, "Device author");
  assert.equal(planned.summary.reflections, 1);
  assert.equal(planned.summary.existing.flows, 1);
  assert.equal(planned.summary.conflicts.length, 0);
  assert.deepEqual(source, before);
  assert.deepEqual(target, initialWorkspace());
  const saved = planned.merged.sessions[0];
  assert.equal(saved.id, source.sessions[0].id);
  assert.equal(saved.flowId, "device-flow");
  assert.equal(saved.reflection?.notes, "Private device notes");
  const repeat = planWorkspaceImport(planned.merged, validateImportWorkspace(source));
  assert.deepEqual(repeat.summary.added, { flows: 0, sessions: 0, templates: 0 });
  assert.equal(repeat.summary.conflicts.length, 0);
  assert.deepEqual(repeat.merged, planned.merged);
});

test("conflicting IDs keep account versions, including newer reflection notes", () => {
  const source = validateImportWorkspace(device());
  const target = structuredClone(source);
  target.flows[0].title = "Edited in account";
  target.sessions[0].reflection!.notes = "Newer account notes";
  const before = structuredClone(target);
  const planned = planWorkspaceImport(target, source);
  assert.equal(planned.summary.conflicts.length, 2);
  assert.deepEqual(planned.summary.added, { flows: 0, sessions: 0, templates: 0 });
  assert.deepEqual(planned.merged, before);
  assert.deepEqual(target, before);
});

test("review tokens bind the exact account, source and destination, independent of object key order", async () => {
  const target = initialWorkspace();
  const source = device();
  const alice = await reviewWorkspaceImport(target, source, "alice");
  assert.match(alice.token, /^[a-f0-9]{64}$/);
  assert.notEqual(alice.token, (await reviewWorkspaceImport(target, source, "bob")).token);
  const changedSource = structuredClone(source);
  changedSource.sessions[0].reflection!.notes = "Changed after review";
  assert.notEqual(alice.token, (await reviewWorkspaceImport(target, changedSource, "alice")).token);
  target.flows[0].title = "Changed in another browser";
  assert.notEqual(alice.token, (await reviewWorkspaceImport(target, source, "alice")).token);
  assert.equal(canonical({ a: 1, b: 2 }), canonical({ b: 2, a: 1 }));
});

test("malformed records fail without partial changes or trusting derived totals", () => {
  const source = device();
  const invalid = [
    null,
    { ...source, version: 2 },
    { ...source, flows: [null] },
    { ...source, flows: [source.flows[0], source.flows[0]] },
    { ...source, flows: [{ ...source.flows[0], blocks: [] }] },
    {
      ...source,
      flows: [
        { ...source.flows[0], blocks: [{ ...source.flows[0].blocks[0], durationMinutes: -1 }] },
      ],
    },
    { ...source, sessions: [null] },
    { ...source, sessions: [{ ...source.sessions[0], focusMinutes: 10 }] },
    { ...source, sessions: [{ ...source.sessions[0], startedAt: "invalid" }] },
    { ...source, sessions: [{ ...source.sessions[0], status: "invented" }] },
    { ...source, sessions: [{ ...source.sessions[0], hasReflection: false }] },
    {
      ...source,
      sessions: [
        {
          ...source.sessions[0],
          reflection: { ...source.sessions[0].reflection, comprehension: 6 },
        },
      ],
    },
    { ...source, templates: [{ ...source.templates[0], author: "" }] },
  ];
  const before = structuredClone(source);
  for (const value of invalid) assert.throws(() => validateImportWorkspace(value));
  assert.deepEqual(source, before);
  source.flows[0].totalMinutes = 999;
  assert.equal(validateImportWorkspace(source).flows[0].totalMinutes, 30);
});

test("account limits reject the entire plan, and unknown fields cannot grant ownership", () => {
  const source = device();
  const target = initialWorkspace();
  target.flows = Array.from({ length: 100 }, (_, i) => ({
    ...structuredClone(target.flows[0]),
    id: `account-${i}`,
  }));
  const before = structuredClone(target);
  assert.throws(() => planWorkspaceImport(target, validateImportWorkspace(source)), /limit/);
  assert.deepEqual(target, before);
  const sanitized = validateImportWorkspace({
    ...source,
    userId: "somebody-else",
    role: "admin",
    accessToken: "ignore",
  });
  assert(!("userId" in sanitized));
  assert(!("role" in sanitized));
  assert(!("accessToken" in sanitized));
});
