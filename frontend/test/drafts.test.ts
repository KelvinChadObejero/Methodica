import { test } from "node:test";
import assert from "node:assert/strict";
import {
  draftKey,
  writeDraft,
  readDraft,
  clearDraft,
  isFlowDraft,
  isReflectionDraft,
} from "../src/lib/drafts";
import { initialWorkspace } from "../../backend/src/seed";

test("recovery copies isolate accounts, device work and sessions without clearing unrelated storage", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const records = new Map([["unrelated", "keep"]]);
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
    },
  });
  try {
    const key = draftKey("account-alice", "builder");
    const value = { flow: initialWorkspace().flows[0], isNew: false };
    assert(writeDraft(key, value));
    assert.deepEqual(readDraft(key, isFlowDraft), value);
    assert.equal(readDraft(draftKey("account-bob", "builder"), isFlowDraft), null);
    assert.equal(readDraft(draftKey("device", "builder"), isFlowDraft), null);
    const reflection = { comprehension: 4, fatigue: 2, notes: "Unsaved notes\nkept intact" };
    const sessionKey = draftKey("account-alice", "reflection-1");
    assert(writeDraft(sessionKey, reflection));
    assert.deepEqual(readDraft(sessionKey, isReflectionDraft), reflection);
    assert.equal(readDraft(draftKey("account-alice", "reflection-2"), isReflectionDraft), null);
    records.set(key, '{"flow":null,"isNew":true}');
    assert.equal(readDraft(key, isFlowDraft), null);
    records.set(sessionKey, '{"notes":"bad","comprehension":99,"fatigue":2}');
    assert.equal(readDraft(sessionKey, isReflectionDraft), null);
    clearDraft(key);
    assert.equal(records.get("unrelated"), "keep");
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get: () => {
        throw new Error("Storage blocked");
      },
    });
    assert.equal(writeDraft(key, value), false);
    assert.equal(readDraft(key, isFlowDraft), null);
    assert.doesNotThrow(() => clearDraft(key));
  } finally {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
