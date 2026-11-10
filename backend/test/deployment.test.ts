import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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
import { runtimeDatabaseUrl } from "../src/database-url.js";

test("the configured Vercel entry point runs in native Node without a TS loader", () => {
  const entry = new URL("../index.cjs", import.meta.url).href;
  const script = `
    process.env.VERCEL = "1";
    const app = (await import(${JSON.stringify(entry)})).default;
    const { createServer } = await import("node:http");
    const server = createServer(app).listen(0, "127.0.0.1");
    await new Promise(done => server.once("listening", done));
    try {
      const base = "http://127.0.0.1:" + server.address().port;
      const health = await fetch(base + "/api/health");
      const preview = await fetch(base + "/api/preview");
      const catalog = await fetch(base + "/api/studytypes");
      const workspace = await fetch(base + "/api/workspace");
      const write = await fetch(base + "/api/flows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Example" }) });
      console.log(JSON.stringify({ health: health.status, preview: preview.status, catalog: catalog.status, workspace: workspace.status, write: write.status, seed: await preview.json() }));
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
  assert.equal(result.write, 503);
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
    assert.deepEqual(readdirSync(fileURLToPath(new URL(`../${output}`, import.meta.url))).sort(), [
      "index.cjs",
      "server.mjs",
    ]);
    copyFileSync(fileURLToPath(new URL(`../${output}/index.cjs`, import.meta.url)), collected);
    copyFileSync(
      fileURLToPath(new URL(`../${output}/server.mjs`, import.meta.url)),
      join(directory, "server.mjs")
    );
    const entry = pathToFileURL(collected).href;
    const script = `process.env.VERCEL = "1"; const app = (await import(${JSON.stringify(entry)})).default; const { createServer } = await import("node:http"); const server = createServer(app).listen(0, "127.0.0.1"); await new Promise(done => server.once("listening", done)); try { const response = await fetch("http://127.0.0.1:" + server.address().port + "/api/health"); if (response.status !== 200) throw new Error("Bundle did not start"); console.log("handler-ready"); } finally { await new Promise(done => server.close(done)); }`;
    const result = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: directory,
      encoding: "utf8",
      timeout: 15000,
      env: {
        ...process.env,
        NODE_PATH: "",
      },
    });
    assert.match(result, /handler-ready/);
  } finally {
    assert(resolve(directory).startsWith(resolve(tmpdir()) + sep + "methodica-vercel-runtime-"));
    rmSync(directory, { recursive: true, force: true });
  }
});

test("hosted preview migrations require distinct matching preview database URLs", () => {
  const guard = fileURLToPath(new URL("../scripts/check-preview-isolation.mjs", import.meta.url));
  const run = (env: Record<string, string>) =>
    spawnSync(process.execPath, [guard], { env, encoding: "utf8" });
  const base = {
    VERCEL: "1",
    VERCEL_ENV: "preview",
    DATABASE_URL: "postgresql://user:pass@prod-pooler.example/db",
    PREVIEW_DATABASE_URL: "postgresql://user:pass@preview-pooler.example/db",
    PREVIEW_DATABASE_URL_UNPOOLED: "postgresql://user:pass@preview.example/db",
  };
  assert.equal(run(base).status, 0);
  assert.equal(run({ ...base, PREVIEW_DATABASE_URL: base.DATABASE_URL }).status, 1);
  assert.equal(
    run({ ...base, PREVIEW_DATABASE_URL_UNPOOLED: "postgresql://user:pass@other.example/db" })
      .status,
    1
  );
  assert.equal(run({ VERCEL: "1", VERCEL_ENV: "preview" }).status, 1);
  assert.equal(run({ VERCEL: "1" }).status, 1);
  assert.equal(run({ VERCEL: "1", VERCEL_ENV: "production" }).status, 0);
  assert.equal(run({}).status, 0);
  const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.match(
    config.services.backend.buildCommand,
    /^node scripts\/check-preview-isolation\.mjs && npm run db:migrate/
  );
});

test("preview runtime never falls back to production storage", () => {
  assert.equal(
    runtimeDatabaseUrl({ VERCEL: "1", VERCEL_ENV: "preview", DATABASE_URL: "prod" }),
    undefined
  );
  assert.equal(
    runtimeDatabaseUrl({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      DATABASE_URL: "prod",
      PREVIEW_DATABASE_URL: "preview",
    }),
    "preview"
  );
  assert.equal(
    runtimeDatabaseUrl({
      VERCEL: "1",
      VERCEL_ENV: "production",
      DATABASE_URL: "prod",
      PREVIEW_DATABASE_URL: "preview",
    }),
    "prod"
  );
  assert.equal(runtimeDatabaseUrl({ DATABASE_URL: "local" }), "local");
});

test("hosted preview migrations select only the isolated unpooled URL", async () => {
  const prior = { ...process.env };
  try {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_URL = "postgresql://production.example/db";
    process.env.DATABASE_URL_UNPOOLED = "postgresql://production.example/db";
    process.env.PREVIEW_DATABASE_URL_UNPOOLED = "postgresql://preview.example/db";
    const config = (await import("../prisma.config.js")).default;
    assert.equal(config.datasource?.url, process.env.PREVIEW_DATABASE_URL_UNPOOLED);
  } finally {
    for (const key of ["VERCEL", "VERCEL_ENV", "DATABASE_URL", "DATABASE_URL_UNPOOLED", "PREVIEW_DATABASE_URL_UNPOOLED"]) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
  }
});
