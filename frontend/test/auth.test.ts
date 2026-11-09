import { test } from "node:test";
import assert from "node:assert/strict";
import { api, setAccountScope } from "../src/lib/api";

test("private 401 clears account state, while rejected login keeps the form recoverable", async (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const events = new EventTarget();
  Object.defineProperty(globalThis, "window", { value: events, configurable: true });
  let expired = 0;
  let sent: RequestInit | undefined;
  events.addEventListener("methodica-session-expired", () => expired++);
  t.mock.method(globalThis, "fetch", async (_input, options) => {
    sent = options;
    return new Response(JSON.stringify({ message: "Log in again." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  });
  try {
    setAccountScope("alice");
    await assert.rejects(api("/workspace"), /Log in again/);
    assert.equal(expired, 1);
    assert.equal(new Headers(sent?.headers).get("X-Methodica-Account"), "alice");
    assert.equal(sent?.credentials, "same-origin");
    await assert.rejects(
      api("/auth/sign-in/email", "POST", { email: "alice@example.test", password: "incorrect" })
    );
    assert.equal(expired, 1);
    assert.equal(new Headers(sent?.headers).get("X-Methodica-Account"), null);
    setAccountScope(null);
    await assert.rejects(api("/workspace"));
    assert.equal(new Headers(sent?.headers).get("X-Methodica-Account"), null);
  } finally {
    setAccountScope(null);
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("a delayed rejection from the previous account does not expire the current account", async (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const events = new EventTarget();
  Object.defineProperty(globalThis, "window", { value: events, configurable: true });
  let expired = 0;
  events.addEventListener("methodica-session-expired", () => expired++);
  let complete!: (response: Response) => void;
  t.mock.method(
    globalThis,
    "fetch",
    () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      })
  );
  try {
    setAccountScope("previous-student");
    const pending = api("/shared-sessions");
    setAccountScope("current-student");
    complete(
      new Response(JSON.stringify({ message: "The active account changed." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );
    await assert.rejects(pending, /account changed/);
    assert.equal(expired, 0);
  } finally {
    setAccountScope(null);
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
