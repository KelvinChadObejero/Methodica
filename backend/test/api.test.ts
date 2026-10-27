import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import { createApp } from "../src/app.js";
import type { SessionLog, StudyFlow, StudyFlowTemplate, Workspace } from "../src/domain.js";

test("hosted workspace requests fail clearly until durable storage is configured", async () => {
  const previous = process.env.VERCEL;
  process.env.VERCEL = "1";
  const server = createApp().listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    assert.equal((await fetch(base + "/api/health")).status, 200);
    const response = await fetch(base + "/api/workspace");
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /Persistent database/);
  } finally {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
    await new Promise<void>((done) => server.close(() => done()));
  }
});

test("study journey persists flows, sessions, reflections and imports across API restarts", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "methodica-api-test-"));
  const dataFile = join(directory, "workspace.json");
  let server = createApp({ dataFile }).listen(0, "127.0.0.1");
  await once(server, "listening");
  let address = server.address();
  assert(address && typeof address !== "string");
  let base = `http://127.0.0.1:${address.port}`;
  async function request(path: string, method = "GET", body?: unknown) {
    const response = await fetch(base + path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  }
  t.after(async () => {
    await new Promise<void>((done) => server.close(() => done()));
    assert(
      resolve(directory).startsWith(resolve(tmpdir()) + "\\methodica-api-test-") ||
        resolve(directory).startsWith(resolve(tmpdir()) + "/methodica-api-test-")
    );
    rmSync(directory, { recursive: true, force: true });
  });

  const initial = await request("/api/workspace");
  assert.equal(initial.status, 200);
  assert.equal((initial.body as Workspace).sessions.length, 0);
  const techniques = (await request("/api/studytypes")).body;
  assert(techniques.some((item: { id: string }) => item.id === "spaced-repetition"));
  assert(techniques.some((item: { id: string }) => item.id === "feynman"));
  const body = {
    title: "  Biology review  ",
    tag: "Biology",
    totalMinutes: 999,
    blocks: [
      { title: "Recall", type: "recall", durationMinutes: 1 },
      { title: "Explain", type: "review", durationMinutes: 2 },
    ],
  };
  for (const invalid of [
    null,
    [],
    { ...body, title: " " },
    { ...body, blocks: [] },
    { ...body, blocks: [{ title: "Invalid", type: "focus", durationMinutes: -2 }] },
    { ...body, blocks: [{ title: "Break only", type: "break", durationMinutes: 5 }] },
    { ...body, blocks: [{ title: "Fractional", type: "focus", durationMinutes: 1.5 }] },
  ]) {
    assert.equal((await request("/api/flows", "POST", invalid)).status, 400);
  }
  const created = await request("/api/flows", "POST", body);
  assert.equal(created.status, 201);
  const flow = created.body as StudyFlow;
  assert.equal(flow.title, "Biology review");
  assert.equal(flow.totalMinutes, 3);
  const withTechnique = {
    ...body,
    blocks: [{ title: "Explain", type: "recall", studyTypeId: "feynman", durationMinutes: 10 }],
  };
  assert.equal(
    (
      await request("/api/flows", "POST", {
        ...withTechnique,
        blocks: [{ ...withTechnique.blocks[0], type: "break" }],
      })
    ).status,
    400
  );
  const techniqueFlow = await request("/api/flows", "POST", withTechnique);
  assert.equal(techniqueFlow.status, 201);
  assert.equal(techniqueFlow.body.blocks[0].studyTypeId, "feynman");
  assert.notEqual(flow.blocks[0].id, flow.blocks[1].id);
  assert.equal(
    (await request(`/api/flows/${flow.id}`, "PUT", { ...body, title: "Edited flow" })).status,
    200
  );
  assert.equal((await request("/api/flows/missing", "PUT", body)).status, 404);

  const published = await request(`/api/flows/${flow.id}/publish`, "POST", { author: "Kelvin" });
  assert.equal(published.status, 200);
  const template = published.body as StudyFlowTemplate;
  const imported = await request(`/api/templates/${template.id}/import`, "POST");
  const again = await request(`/api/templates/${template.id}/import`, "POST");
  assert.equal(imported.body.id, again.body.id);
  assert.notEqual(imported.body.id, flow.id);
  assert.equal(imported.body.sourceTemplateId, template.id);

  const payload = {
    id: "a-session-id",
    flowId: flow.id,
    flowTitle: "Snapshot title",
    flowTag: "Biology",
    subject: "Biology",
    startedAt: new Date(Date.now() - 180000).toISOString(),
    durationMinutes: 2,
    focusMinutes: 1.5,
    status: "stopped",
  };
  assert.equal(
    (await request("/api/sessions", "POST", { ...payload, focusMinutes: 3 })).status,
    400
  );
  assert.equal(
    (await request("/api/sessions", "POST", { ...payload, startedAt: "not-a-date" })).status,
    400
  );
  assert.equal(
    (await request("/api/sessions", "POST", { ...payload, startedAt: new Date().toISOString() }))
      .status,
    400
  );
  assert.equal((await request("/api/sessions", "POST", payload)).status, 201);
  assert.equal((await request("/api/sessions", "POST", payload)).status, 200);
  assert.equal(
    (await request("/api/sessions", "POST", { ...payload, subject: "Changed" })).status,
    409
  );
  assert.equal(
    (
      await request(`/api/sessions/${payload.id}/log`, "PUT", {
        comprehension: 6,
        fatigue: 2,
        notes: "",
      })
    ).status,
    400
  );
  assert.equal(
    (
      await request(`/api/sessions/${payload.id}/log`, "PUT", {
        comprehension: 4,
        fatigue: 2,
        notes: "Recall exposed a gap.",
      })
    ).status,
    200
  );
  assert.equal(
    (await request("/api/sessions/missing/log", "PUT", { comprehension: 4, fatigue: 2, notes: "" }))
      .status,
    404
  );

  await new Promise<void>((done) => server.close(() => done()));
  server = createApp({ dataFile }).listen(0, "127.0.0.1");
  await once(server, "listening");
  address = server.address();
  assert(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}`;
  const sessions = (await request("/api/sessions")).body as SessionLog[];
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].reflection?.notes, "Recall exposed a gap.");
  assert.equal(sessions[0].hasReflection, true);
  assert.equal((await request(`/api/flows/${flow.id}`, "DELETE")).status, 204);
  assert.equal((await request("/api/sessions")).body[0].flowTitle, "Snapshot title");

  const concurrent = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      request("/api/flows", "POST", { ...body, title: `Concurrent ${index}` })
    )
  );
  assert(concurrent.every((response) => response.status === 201));
  const workspace = (await request("/api/workspace")).body as Workspace;
  assert.equal(workspace.flows.filter((item) => item.title.startsWith("Concurrent")).length, 20);
  assert.equal((await request("/api/missing")).status, 404);
  const malformed = await fetch(base + "/api/flows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).message, /Invalid JSON/);

  const original = readFileSync(dataFile, "utf8");
  writeFileSync(dataFile, "broken JSON");
  const log = t.mock.method(console, "error", () => {});
  assert.equal((await request("/api/workspace")).status, 500);
  assert.equal((await request("/api/flows", "POST", body)).status, 500);
  assert.equal(readFileSync(dataFile, "utf8"), "broken JSON");
  log.mock.restore();
  writeFileSync(dataFile, original);
  assert.equal((await request("/api/workspace")).status, 200);
});
