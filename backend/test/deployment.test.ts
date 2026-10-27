import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  mkdtempSync,
  copyFileSync,
  writeFileSync,
  rmSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

test("the configured Vercel entry point runs in native Node without a TS loader", () => {
  const entry = new URL("../index.cjs", import.meta.url).href;
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

test("the deployed bundle still starts when collected under a CommonJS package scope", () => {
  const directory = mkdtempSync(join(tmpdir(), "methodica-vercel-runtime-"));
  try {
    writeFileSync(join(directory, "package.json"), JSON.stringify({ type: "commonjs" }));
    const collected = join(directory, "app.js");
    const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
    const output = config.services.backend.outputDirectory;
    assert.equal(output, "dist/vercel");
    assert.deepEqual(readdirSync(fileURLToPath(new URL(`../${output}`, import.meta.url))), [
      "index.cjs",
    ]);
    copyFileSync(fileURLToPath(new URL(`../${output}/index.cjs`, import.meta.url)), collected);
    const entry = pathToFileURL(collected).href;
    const script = `process.env.VERCEL = "1"; const app = (await import(${JSON.stringify(entry)})).default; if (typeof app !== "function") throw new Error("No Express handler exported"); console.log("handler-ready");`;
    const result = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: directory,
      encoding: "utf8",
      timeout: 15000,
      env: {
        ...process.env,
        NODE_PATH: fileURLToPath(new URL("../node_modules", import.meta.url)),
      },
    });
    assert.match(result, /handler-ready/);
  } finally {
    assert(resolve(directory).startsWith(resolve(tmpdir()) + sep + "methodica-vercel-runtime-"));
    rmSync(directory, { recursive: true, force: true });
  }
});
