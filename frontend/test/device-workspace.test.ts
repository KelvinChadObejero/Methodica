import { test } from "node:test";
import assert from "node:assert/strict";
import { DeviceWorkspace, DEVICE_WORKSPACE_KEY } from "../src/lib/device-workspace";
import { initialWorkspace, studyTypes } from "../../backend/src/seed";

function browserStorage() {
  const values = new Map<string, string>([["unrelated-app", "leave this alone"]]);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

test("device flows, sessions and reflections survive a new store without an API", () => {
  const storage = browserStorage();
  const store = new DeviceWorkspace(storage);
  store.initialize({ workspace: initialWorkspace(), studyTypes });
  const flow = store.saveFlow(
    { ...initialWorkspace().flows[0], title: "Biology", tag: "Biology" },
    true
  );
  const input = {
    id: "a-device-session",
    flowId: flow.id,
    flowTitle: flow.title,
    flowTag: flow.tag,
    subject: flow.tag,
    startedAt: new Date(Date.now() - 60000).toISOString(),
    durationMinutes: 1,
    focusMinutes: 1,
    status: "completed" as const,
  };
  store.saveSession(input);
  store.saveReflection(input.id, { comprehension: 4, fatigue: 2, notes: "Recall exposed a gap." });
  store.saveSession(input); // Retrying a saved run must preserve its reflection.
  assert.throws(() => store.saveSession({ ...input, subject: "Different" }), /already belongs/);
  store.publishFlow(flow.id, "Example author");
  const firstImport = store.importTemplate("recall-loop");
  assert.equal(store.importTemplate("recall-loop").id, firstImport.id);
  store.deleteFlow(flow.id);
  const restored = new DeviceWorkspace(storage).read();
  assert.equal(restored.workspace.sessions.length, 1);
  assert.equal(restored.workspace.sessions[0].reflection?.notes, "Recall exposed a gap.");
  assert(restored.workspace.templates.some((template) => template.id === `published-${flow.id}`));
  assert.equal(storage.values.get("unrelated-app"), "leave this alone");
  store.initialize({ workspace: initialWorkspace(), studyTypes });
  assert.equal(store.read().workspace.sessions.length, 1); // Re-entering device mode must not reset data.
});

test("corrupt or full browser storage never reports a successful save or resets data", () => {
  const storage = browserStorage();
  const store = new DeviceWorkspace(storage);
  storage.values.set(DEVICE_WORKSPACE_KEY, "broken JSON");
  assert.throws(
    () => store.initialize({ workspace: initialWorkspace(), studyTypes }),
    /not been reset/
  );
  assert.equal(storage.values.get(DEVICE_WORKSPACE_KEY), "broken JSON");
  storage.values.delete(DEVICE_WORKSPACE_KEY);
  store.initialize({ workspace: initialWorkspace(), studyTypes });
  const before = storage.values.get(DEVICE_WORKSPACE_KEY);
  const fullStore = new DeviceWorkspace({
    getItem: storage.getItem,
    setItem: () => {
      throw new Error("quota");
    },
  });
  assert.throws(
    () => fullStore.saveFlow({ ...initialWorkspace().flows[0], title: "Unsaved flow" }, true),
    /could not save/
  );
  assert.equal(storage.values.get(DEVICE_WORKSPACE_KEY), before);
});
