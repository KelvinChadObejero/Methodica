import { historyQuery } from "../src/history.js";
import { reportQuery, studyReport } from "../src/reporting.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { startPrismaDevServer } from "@prisma/dev";
import { createApp } from "../src/app.js";
import { AccountWorkspace, createDatabase, seedStudyTypes } from "../src/database.js";
import { createAuthentication } from "../src/auth.js";
import { reviewWorkspaceImport } from "../src/workspace-import.js";
import { initialWorkspace } from "../src/seed.js";
import type { Workspace } from "../src/domain.js";
import type { Prisma } from "../src/generated/prisma/client.js";

test(
  "accounts persist, revoke sessions and isolate every workspace route",
  { timeout: 120000 },
  async () => {
    const postgres = process.env.TEST_DATABASE_URL
      ? null
      : await startPrismaDevServer({
          persistenceMode: "stateless",
          name: "methodica-auth-test",
          port: 0,
          databasePort: 0,
          shadowDatabasePort: 0,
          streamsPort: 0,
        });
    const url = process.env.TEST_DATABASE_URL || postgres!.database.connectionString;
    // PGlite's wire server multiplexes one PostgreSQL session. CI uses real PG
    // and the production-sized pool to test concurrent row-lock transactions.
    const db = createDatabase(url, postgres ? 1 : 3);
    const server = createServer();
    try {
      await promisify(execFile)(
        process.execPath,
        ["node_modules/prisma/build/index.js", "migrate", "deploy"],
        {
          env: { ...process.env, DATABASE_URL: url },
          stdio: "pipe",
          timeout: 30000,
        }
      );
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      assert(address && typeof address !== "string");
      const origin = `http://127.0.0.1:${address.port}`;
      const auth = createAuthentication(db, randomBytes(48).toString("base64url"), [origin]);
      const app = createApp({ accounts: { db, auth, origins: [origin] } });
      server.on("request", app);
      async function request(
        path: string,
        method = "GET",
        body?: unknown,
        cookie = "",
        originHeader = origin
      ) {
        const response = await fetch(origin + "/api" + path, {
          method,
          headers: { "Content-Type": "application/json", Origin: originHeader, Cookie: cookie },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const payload = response.status === 204 ? null : await response.json();
        const setCookie = response.headers.getSetCookie();
        return {
          status: response.status,
          body: payload,
          setCookie,
          cookie: setCookie.map((value) => value.split(";")[0]).join("; "),
        };
      }
      const password = "study with clear intention 2026";
      const alice = { name: "Alice", email: "alice@example.test", password };
      assert.equal((await request("/workspace")).status, 401);
      assert.equal(
        (await request("/auth/sign-up/email", "POST", { ...alice, password: "short" })).status,
        400
      );
      assert.equal(
        (await request("/auth/sign-up/email", "POST", { ...alice, email: "invalid" })).status,
        400
      );
      const signedUp = await request("/auth/sign-up/email", "POST", alice);
      assert.equal(signedUp.status, 200, JSON.stringify(signedUp.body));
      assert(signedUp.cookie.includes("methodica.session_token"));
      assert(
        signedUp.setCookie.some((value) => /httponly/i.test(value) && /samesite=lax/i.test(value))
      );
      assert(!JSON.stringify(signedUp.body).includes(password));
      const firstCookie = signedUp.cookie;
      const mismatched = await fetch(origin + "/api/flows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: firstCookie,
          "X-Methodica-Account": "another-user",
        },
        body: JSON.stringify({ title: "Must not be written" }),
      });
      assert.equal(mismatched.status, 401);
      const duplicate = await request("/auth/sign-up/email", "POST", {
        ...alice,
        email: "ALICE@example.test",
      });
      assert(duplicate.status >= 400);
      assert.equal(await db.user.count(), 1);
      const credential = await db.account.findFirstOrThrow();
      assert(credential.password && credential.password !== password);
      const workspace = await request("/workspace", "GET", undefined, firstCookie);
      assert.equal(workspace.status, 200);
      assert.equal(workspace.body.sessions.length, 0);
      const flowInput = {
        title: "Alice private flow",
        tag: "Biology",
        blocks: [{ title: "Recall", type: "recall", durationMinutes: 1 }],
      };
      const flow = await request("/flows", "POST", flowInput, firstCookie);
      assert.equal(flow.status, 201);
      assert.equal(
        (await request("/flows", "POST", flowInput, firstCookie, "https://untrusted.example"))
          .status,
        403
      );
      assert.equal(
        (await request("/auth/sign-out", "POST", {}, firstCookie, "https://untrusted.example"))
          .status,
        403
      );
      const sessionInput = {
        id: "alice-session",
        flowId: flow.body.id,
        flowTitle: flow.body.title,
        flowTag: "Biology",
        subject: "Biology",
        startedAt: new Date(Date.now() - 120000).toISOString(),
        durationMinutes: 1,
        focusMinutes: 1,
        blocks: flow.body.blocks,
        execution: {
          version: 1,
          blocks: [{ blockId: flow.body.blocks[0].id, elapsedMs: 60000, outcome: "completed" }],
          events: [
            { blockId: flow.body.blocks[0].id, type: "started", atMs: 0 },
            { blockId: flow.body.blocks[0].id, type: "completed", atMs: 60000 },
          ],
        },
        status: "completed",
      };
      assert.equal((await request("/sessions", "POST", sessionInput, firstCookie)).status, 201);
      const reflection = { comprehension: 4, fatigue: 2, notes: "Alice private notes" };
      assert.equal(
        (await request("/sessions/alice-session/log", "PUT", reflection, firstCookie)).status,
        200
      );
      assert.equal(
        (await request(`/flows/${flow.body.id}/publish`, "POST", { author: "Alice" }, firstCookie))
          .status,
        200
      );
      const recorded = await request("/sessions/alice-session", "GET", undefined, firstCookie);
      assert.deepEqual(recorded.body.blocks, flow.body.blocks);
      assert.deepEqual(recorded.body.execution, sessionInput.execution);
      assert.equal(
        (
          await request(
            "/sessions",
            "POST",
            {
              ...sessionInput,
              id: "bad-execution",
              execution: { ...sessionInput.execution, events: [] },
            },
            firstCookie
          )
        ).status,
        400
      );
      assert.equal(
        (await request("/sessions/page?q=%25", "GET", undefined, firstCookie)).body.total,
        0
      );
      const history = await request(
        "/sessions/page?q=PRIVATE&reflected=true&limit=1",
        "GET",
        undefined,
        firstCookie
      );
      assert.equal(history.body.total, 1);
      assert.equal(history.body.items[0].id, "alice-session");
      assert.equal(
        (await request("/sessions/page?limit=0", "GET", undefined, firstCookie)).status,
        400
      );
      assert.equal(
        (await request("/reports/summary?timezone=Not/AZone", "GET", undefined, firstCookie))
          .status,
        400
      );
      const report = await request(
        "/reports/summary?days=7&timezone=Asia%2FTaipei",
        "GET",
        undefined,
        firstCookie
      );
      assert.equal(report.status, 200, JSON.stringify(report.body));
      assert.equal(report.body.focusMinutes, 1);
      assert.equal(report.body.count, 1);
      const reportParams = new URLSearchParams({
        days: "7",
        timezone: report.body.timezone,
        until: report.body.until,
        revision: String(report.body.revision),
      });
      const exported = await request(
        `/reports/sessions?${reportParams}`,
        "GET",
        undefined,
        firstCookie
      );
      assert(exported.body.csv.includes("Alice private notes"));
      await request("/flows", "POST", flowInput, firstCookie);
      assert.equal(
        (
          await request(
            `/sessions/page?revision=${history.body.revision}`,
            "GET",
            undefined,
            firstCookie
          )
        ).status,
        409
      );
      assert.equal(
        (await request(`/reports/sessions?${reportParams}`, "GET", undefined, firstCookie)).status,
        409
      );
      const bob = await request("/auth/sign-up/email", "POST", {
        name: "Bob",
        email: "bob@example.test",
        password,
      });
      assert.equal(bob.status, 200, JSON.stringify(bob.body));
      const bobsCookie = bob.cookie;
      assert.equal(
        (await request("/sessions/alice-session", "GET", undefined, bobsCookie)).status,
        404
      );
      assert.equal(
        (await request("/sessions/page?q=Alice", "GET", undefined, bobsCookie)).body.total,
        0
      );
      assert.equal(
        (await request("/reports/summary", "GET", undefined, bobsCookie)).body.focusMinutes,
        0
      );
      const bobWorkspace = await request("/workspace", "GET", undefined, bobsCookie);
      assert(!JSON.stringify(bobWorkspace.body).includes("Alice"));
      for (const [path, method, body] of [
        [`/flows/${flow.body.id}`, "PUT", flowInput],
        [`/flows/${flow.body.id}`, "DELETE", undefined],
        [`/flows/${flow.body.id}/publish`, "POST", { author: "Bob" }],
        ["/sessions/alice-session/log", "PUT", reflection],
        [`/templates/published-${flow.body.id}/import`, "POST", {}],
      ] as const)
        assert.equal((await request(path, method, body, bobsCookie)).status, 404, path);
      // Concurrent transactions must preserve both records, without overwriting.
      const results = await Promise.all(
        ["One", "Two"].map((title) =>
          request("/flows", "POST", { ...flowInput, title }, firstCookie)
        )
      );
      assert(results.every((result) => result.status === 201));
      assert.equal(
        (await request("/flows", "GET", undefined, firstCookie)).body.length,
        workspace.body.flows.length + 4
      );
      assert.equal((await request("/auth/sign-out", "POST", {}, firstCookie)).status, 200);
      assert.equal((await request("/workspace", "GET", undefined, firstCookie)).status, 401);
      const wrongPassword = await request("/auth/sign-in/email", "POST", {
        email: alice.email,
        password: "wrong password",
      });
      const unknownAccount = await request("/auth/sign-in/email", "POST", {
        email: "unknown@example.test",
        password,
      });
      assert.equal(wrongPassword.status, 401);
      assert.equal(wrongPassword.body.message, unknownAccount.body.message);
      const login = await request("/auth/sign-in/email", "POST", {
        email: "ALICE@example.test",
        password,
      });
      assert.equal(login.status, 200);
      assert.notEqual(login.cookie, firstCookie);
      const restored = await request("/workspace", "GET", undefined, login.cookie);
      assert.equal(restored.body.sessions[0].reflection.notes, reflection.notes);
      assert.deepEqual(restored.body.sessions[0].execution, sessionInput.execution);
      const me = await request("/auth/get-session", "GET", undefined, login.cookie);
      assert.equal(me.body.user.email, alice.email);
      const device = initialWorkspace();
      device.flows.unshift({
        ...structuredClone(device.flows[0]),
        id: "device-flow",
        title: "Device study",
      });
      device.flows.push({ ...flow.body, title: "Conflicting browser version" });
      device.templates.unshift({
        ...structuredClone(device.flows[0]),
        id: "device-template",
        author: "Device author",
      });
      device.sessions.push({
        ...sessionInput,
        id: "device-session",
        execution: undefined,
        focusMinutes: 0,
        status: "stopped",
        timingSource: "legacy-estimate",
        flowId: "device-flow",
        hasReflection: true,
        reflection: { ...reflection, sessionTitle: "Device study", sessionSubtitle: "Biology" },
      });
      const beforeImport = (await request("/workspace", "GET", undefined, login.cookie))
        .body as Workspace;
      const reviewed = await reviewWorkspaceImport(beforeImport, device, signedUp.body.user.id);
      const payload = { workspace: device, reviewToken: reviewed.token };
      assert.equal((await request("/workspace/import", "POST", payload)).status, 401);
      assert.equal(
        (
          await request(
            "/workspace/import",
            "POST",
            payload,
            login.cookie,
            "https://untrusted.example"
          )
        ).status,
        403
      );
      assert.equal((await request("/workspace/import", "POST", payload, bobsCookie)).status, 409);
      assert.equal(
        (
          await request(
            "/workspace/import",
            "POST",
            { ...payload, workspace: { ...device, sessions: [null] } },
            login.cookie
          )
        ).status,
        400
      );
      assert.deepEqual(
        (await request("/workspace", "GET", undefined, login.cookie)).body,
        beforeImport
      );
      await request("/flows", "POST", { ...flowInput, title: "New account change" }, login.cookie);
      assert.equal((await request("/workspace/import", "POST", payload, login.cookie)).status, 409);
      const current = (await request("/workspace", "GET", undefined, login.cookie))
        .body as Workspace;
      const freshReview = await reviewWorkspaceImport(current, device, signedUp.body.user.id);
      const freshPayload = { workspace: device, reviewToken: freshReview.token };
      const imports = await Promise.all(
        [0, 1].map(() => request("/workspace/import", "POST", freshPayload, login.cookie))
      );
      assert(
        imports.every((result) => result.status === 200),
        JSON.stringify(imports.map((result) => result.body))
      );
      assert.equal(
        imports.reduce((sum, result) => sum + result.body.summary.added.sessions, 0),
        1
      );
      const retried = await request("/workspace/import", "POST", freshPayload, login.cookie);
      assert.equal(
        imports.reduce((sum, result) => sum + result.body.summary.added.templates, 0),
        1
      );
      assert.equal(retried.status, 200);
      assert.deepEqual(retried.body.summary.added, { flows: 0, sessions: 0, templates: 0 });
      const imported = (await request("/workspace", "GET", undefined, login.cookie))
        .body as Workspace;
      assert.equal(
        imported.sessions.find((session) => session.id === "device-session")?.timingSource,
        "legacy-estimate"
      );
      assert.equal(
        (
          await db.studySession.findUniqueOrThrow({
            where: { userId_id: { userId: signedUp.body.user.id, id: "device-session" } },
          })
        ).timingSource,
        "legacy-estimate"
      );
      assert.equal(
        imported.sessions.filter((session) => session.id === "device-session").length,
        1
      );
      assert.equal(
        imported.sessions.find((session) => session.id === "device-session")?.reflection?.notes,
        reflection.notes
      );
      assert.equal(imported.flows.find((item) => item.id === flow.body.id)?.title, flow.body.title);
      assert.equal(
        imported.templates.find((item) => item.id === "device-template")?.author,
        "Device author"
      );
      assert(
        !(await request("/workspace", "GET", undefined, bobsCookie)).body.sessions.some(
          (session: { id: string }) => session.id === "device-session"
        )
      );
      const oldSerializer = (await request("/workspace", "GET", undefined, login.cookie))
        .body as Workspace;
      const oldSession = oldSerializer.sessions.find((session) => session.id === "alice-session")!;
      delete oldSession.blocks;
      delete oldSession.execution;
      await db.workspace.update({
        where: { userId: signedUp.body.user.id },
        data: { data: oldSerializer as unknown as Prisma.InputJsonValue },
      });
      assert.deepEqual(
        (await request("/sessions/alice-session", "GET", undefined, login.cookie)).body.execution,
        sessionInput.execution
      );
      await db.session.updateMany({
        where: { userId: signedUp.body.user.id },
        data: { expiresAt: new Date(0) },
      });
      assert.equal((await request("/workspace", "GET", undefined, login.cookie)).status, 401);
      // Shared database throttling is exercised without an in-memory limiter.
      let lastStatus = 0;
      for (let i = 0; i < 12; i++)
        lastStatus = (
          await request("/auth/sign-in/email", "POST", {
            email: alice.email,
            password: "incorrect",
          })
        ).status;
      assert.equal(lastStatus, 429);
      // Exercise the actual bundled deployment with a database, not just health.
      const bundleScript = `
      process.env.VERCEL = "1";
      const { createServer } = await import("node:http");
      const app = (await import("./dist/vercel/index.cjs")).default;
      const server = createServer(app).listen(0, "127.0.0.1");
      await new Promise(done => server.once("listening", done));
      const base = "http://127.0.0.1:" + server.address().port;
      const signup = await fetch(base + "/api/auth/sign-up/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://methodica-azure.vercel.app", "x-real-ip": "192.0.2.2" }, body: JSON.stringify({ name: "Bundle test", email: "bundle@example.test", password: "deployment test passphrase 2026" }) });
      if (signup.status !== 200) throw new Error("Bundled registration failed: " + await signup.text());
      const cookies = signup.headers.getSetCookie();
      if (!cookies.some(cookie => /secure/i.test(cookie) && /httponly/i.test(cookie))) throw new Error("Production cookie is not secure");
      const workspace = await fetch(base + "/api/workspace", { headers: { Cookie: cookies.map(cookie => cookie.split(";")[0]).join("; ") } });
      if (workspace.status !== 200) throw new Error("Bundled database request failed");
      console.log("bundled-auth-and-database-ready");
      await new Promise(done => server.close(done));
      await (await import("./dist/vercel/server.mjs")).closeAccountServices();
    `;
      const bundled = await promisify(execFile)(
        process.execPath,
        ["--input-type=module", "-e", bundleScript],
        {
          env: {
            ...process.env,
            DATABASE_URL: url,
            LOCAL_PRISMA_DEV: "true",
            BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
          },
          timeout: 30000,
        }
      );
      assert.match(bundled.stdout, /bundled-auth-and-database-ready/);
    } finally {
      await new Promise<void>((done) => server.close(() => done()));
      await db.$disconnect();
      await postgres?.close();
    }
  }
);

test(
  "normalized study tables preserve migrations, rollback, ordering and account isolation",
  { timeout: 120000 },
  async () => {
    const postgres = process.env.TEST_DATABASE_URL
      ? null
      : await startPrismaDevServer({
          persistenceMode: "stateless",
          name: "methodica-domain-test",
          port: 0,
          databasePort: 0,
          shadowDatabasePort: 0,
          streamsPort: 0,
        });
    const url = process.env.TEST_DATABASE_URL || postgres!.database.connectionString;
    let db = createDatabase(url, postgres ? 1 : 3);
    const userId = "domain-alice";
    const otherId = "domain-bob";
    const json = (value: Workspace) => value as unknown as Prisma.InputJsonValue;
    try {
      await promisify(execFile)(
        process.execPath,
        ["node_modules/prisma/build/index.js", "migrate", "deploy"],
        {
          env: { ...process.env, DATABASE_URL: url },
          timeout: 30000,
        }
      );
      for (const id of [userId, otherId])
        await db.user.create({
          data: {
            id,
            name: id,
            email: `${id}@example.test`,
          },
        });
      const legacy = initialWorkspace();
      legacy.flows[0].blocks[0].studyTypeId = "focus";
      legacy.sessions.push({
        id: "historical-session",
        flowId: legacy.flows[0].id,
        flowTitle: "Original historical title",
        flowTag: "General",
        subject: "Biology",
        startedAt: "2026-10-20T08:00:00.000Z",
        durationMinutes: 2,
        focusMinutes: 1.5,
        status: "stopped",
        hasReflection: true,
        reflection: {
          sessionTitle: "Original historical title",
          sessionSubtitle: "Original label",
          comprehension: 4,
          fatigue: 2,
          notes: "Private notes\nwith a second line",
        },
      });
      legacy.sessions[0].blocks = structuredClone(legacy.flows[0].blocks);
      // Simulate an account created by the JSON deployment before this migration.
      await db.workspace.create({ data: { userId, data: json(legacy) } });
      let store = new AccountWorkspace(db, userId);
      assert.deepEqual(await store.read(), legacy);
      assert.equal(await db.studyType.count(), 7);
      await seedStudyTypes(db);
      assert.equal(await db.studyType.count(), 7);
      assert.equal(await db.studyBlock.count({ where: { userId } }), 9);
      assert.equal(
        (await db.studyBlock.findFirstOrThrow({ where: { userId, studyTypeId: "focus" } }))
          .studyTypeId,
        "focus"
      );
      assert.equal(await db.sessionLog.count({ where: { userId } }), 1);
      assert((await db.workspace.findUniqueOrThrow({ where: { userId } })).normalizedDigest);
      const other = new AccountWorkspace(db, otherId);
      await other.read();
      await store.update((data) => {
        // These IDs already exist in Bob's workspace and must remain independent.
        data.flows[0].title = "Alice only";
        data.flows[0].blocks.reverse();
        data.templates[0].id = data.flows[0].id;
      });
      assert.notEqual((await other.read()).flows[0].title, "Alice only");
      const beforeFailure = await store.read();
      await assert.rejects(
        store.update((data) => {
          data.flows[0].title = "Must roll back";
          data.flows[0].blocks[0].studyTypeId = "missing-technique";
        })
      );
      assert.deepEqual(await store.read(), beforeFailure);
      assert.deepEqual(
        (await db.workspace.findUniqueOrThrow({ where: { userId } })).data,
        beforeFailure
      );
      await assert.rejects(
        store.update((data) => {
          data.sessions[0].reflection!.notes = "Must also roll back";
          throw new Error("Abort study change");
        }),
        /Abort study change/
      );
      assert.deepEqual(await store.read(), beforeFailure);
      // A new client/API process reads committed relational rows and exact block order.
      await db.$disconnect();
      db = createDatabase(url, postgres ? 1 : 3);
      store = new AccountWorkspace(db, userId);
      assert.deepEqual(await store.read(), beforeFailure);
      await store.update((data) => {
        data.flows = [];
      });
      assert.equal(await db.studyBlock.count({ where: { userId, flowKind: "flow" } }), 0);
      assert.deepEqual((await store.read()).sessions, legacy.sessions);
      assert.equal(await db.sessionLog.count({ where: { userId } }), 1);
      // A rollback deployment can write JSON; its next write is reconciled safely.
      const rollback = await store.read();
      rollback.sessions[0].reflection!.notes = "Saved by previous deployment";
      await db.workspace.update({ where: { userId }, data: { data: json(rollback) } });
      assert.deepEqual(await store.read(), rollback);
      const oldClient = structuredClone(rollback);
      delete oldClient.sessions[0].blocks;
      await db.workspace.update({ where: { userId }, data: { data: json(oldClient) } });
      assert.deepEqual((await store.read()).sessions[0].blocks, legacy.sessions[0].blocks);

      assert.equal(
        (
          await db.sessionLog.findUniqueOrThrow({
            where: { userId_sessionId: { userId, sessionId: "historical-session" } },
          })
        ).notes,
        "Saved by previous deployment"
      );
      // Exercise a history at the supported limit, including a prepend and update.
      const large = structuredClone(rollback);
      large.sessions = Array.from({ length: 4999 }, (_, index) => ({
        ...legacy.sessions[0],
        id: `legacy history ${index}`,
        reflection: { ...legacy.sessions[0].reflection!, notes: "A".repeat(2000) },
      }));
      assert(JSON.stringify(large).length > 8 * 1024 * 1024);
      await db.workspace.update({ where: { userId }, data: { data: json(large) } });
      assert.equal((await store.read()).sessions.length, 4999);
      await store.update((data) => {
        data.sessions.unshift({ ...legacy.sessions[0], id: "newest-session" });
        data.sessions = [
          ...data.sessions.slice(0, 4000),
          ...Array.from({ length: 1000 }, (_, i) => ({ ...legacy.sessions[0], id: `bulk-${i}` })),
        ];
      });
      const full = await store.read();
      assert.equal(full.sessions.length, 5000);
      assert.equal(full.sessions[0].id, "newest-session");
      assert.equal(full.sessions[4999].id, "bulk-999");
      assert.equal(full.sessions[4999].reflection!.notes, legacy.sessions[0].reflection!.notes);
      const page1 = await store.history(historyQuery(new URLSearchParams("limit=25")));
      const page2 = await store.history({
        ...historyQuery(new URLSearchParams("limit=25&offset=25")),
        revision: page1.revision,
      });
      assert.equal(page1.total, 5000);
      assert.equal(page1.items.length, 25);
      assert.equal(page2.items.length, 25);
      assert(!page2.items.some((row) => page1.items.some((first) => first.id === row.id)));
      assert.equal((await store.overview()).sessions.length, 25);
      assert.equal(
        (await store.session("newest-session"))!.blocks!.length,
        legacy.sessions[0].blocks!.length
      );
      const query = reportQuery(
        new URLSearchParams("days=30&timezone=Asia%2FTaipei"),
        new Date("2026-10-28T08:00:00Z")
      );
      assert.deepEqual(
        await store.report(query),
        studyReport(full.sessions, query, page1.revision)
      );
      assert.equal((await store.reportSessions(query, page1.revision)).length, 5000);
      await store.update((data) => {
        data.sessions[0].reflection!.notes = "Changed after page one";
      });
      await assert.rejects(
        store.history({ ...historyQuery(new URLSearchParams()), revision: page1.revision }),
        /history changed/
      );
      // Same-millisecond old-writer updates invalidate the fast-read marker.
      const marker = await db.workspace.findUniqueOrThrow({ where: { userId } });
      await db.workspace.update({
        where: { userId },
        data: { data: json(rollback), updatedAt: marker.updatedAt },
      });
      assert.equal(
        (await db.workspace.findUniqueOrThrow({ where: { userId } })).normalizedAt,
        null
      );
      assert.equal((await store.history(historyQuery(new URLSearchParams()))).total, 1);
      // DST boundary: local midnight and the repeated hour agree between SQL,
      // the browser adapter, the chart totals and the export membership.
      const dst = structuredClone(rollback);
      dst.sessions = [
        "2026-10-27T06:59:59Z",
        "2026-10-27T07:00:00Z",
        "2026-11-01T08:30:00Z",
        "2026-11-01T09:30:00Z",
        "2026-11-03T07:00:00Z",
      ].map((startedAt, i) => ({
        ...legacy.sessions[0],
        id: `dst-${i}`,
        startedAt: new Date(startedAt).toISOString(),
        focusMinutes: i === 0 ? 0 : 1.5,
        status: "stopped",
      }));
      await db.workspace.update({ where: { userId }, data: { data: json(dst) } });
      const dstQuery = reportQuery(
        new URLSearchParams("days=7&timezone=America%2FLos_Angeles"),
        new Date("2026-11-02T20:00:00Z")
      );
      const dstPage = await store.history(historyQuery(new URLSearchParams()));
      assert.deepEqual(
        await store.report(dstQuery),
        studyReport(dst.sessions, dstQuery, dstPage.revision)
      );
      assert.equal((await store.reportSessions(dstQuery, dstPage.revision)).length, 3);
      await db.workspace.update({ where: { userId }, data: { data: json(rollback) } });
      assert.deepEqual(await store.read(), rollback);
      const corrupt = { ...rollback, flows: [null] } as unknown as Workspace;
      await db.workspace.update({ where: { userId }, data: { data: json(corrupt) } });
      await assert.rejects(store.read());
      assert.deepEqual((await db.workspace.findUniqueOrThrow({ where: { userId } })).data, corrupt);
      assert.equal(await db.sessionLog.count({ where: { userId } }), 1);
      await db.user.delete({ where: { id: userId } });
      assert.equal(await db.studyFlow.count({ where: { userId } }), 0);
      assert.equal(await db.studySession.count({ where: { userId } }), 0);
      assert.equal(await db.sessionLog.count({ where: { userId } }), 0);
      assert.equal(await db.studyFlow.count({ where: { userId: otherId } }), 3);
    } finally {
      await db.user.deleteMany({ where: { id: { in: [userId, otherId] } } }).catch(() => {});
      await db.$disconnect();
      await postgres?.close();
    }
  }
);
