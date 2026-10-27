import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("the configured Vercel entry point runs in native Node without a TS loader", () => {
  const entry = new URL("../index.mjs", import.meta.url).href;
  const script = `
    process.env.VERCEL = "1";
    const app = (await import(${JSON.stringify(entry)})).default;
    const server = app.listen(0, "127.0.0.1");
    await new Promise(done => server.once("listening", done));
    try {
      const base = "http://127.0.0.1:" + server.address().port;
      const health = await fetch(base + "/api/health");
      const preview = await fetch(base + "/api/preview");
      const catalog = await fetch(base + "/api/studytypes");
      const workspace = await fetch(base + "/api/workspace");
      console.log(JSON.stringify({ health: health.status, preview: preview.status, catalog: catalog.status, workspace: workspace.status, seed: await preview.json() }));
    } finally { await new Promise(done => server.close(done)); }
  `;
  const result = JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
      timeout: 15000,
    })
  );
  assert.equal(result.health, 200);
  assert.equal(result.preview, 200);
  assert.equal(result.catalog, 200);
  assert.equal(result.workspace, 503);
  assert.equal(result.seed.workspace.sessions.length, 0);
  assert(result.seed.studyTypes.length > 0);
});
