import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { startPrismaDevServer } from "@prisma/dev";
import { createApp } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { createAuthentication } from "../src/auth.js";

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
      const bob = await request("/auth/sign-up/email", "POST", {
        name: "Bob",
        email: "bob@example.test",
        password,
      });
      assert.equal(bob.status, 200, JSON.stringify(bob.body));
      const bobsCookie = bob.cookie;
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
        workspace.body.flows.length + 3
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
      const me = await request("/auth/get-session", "GET", undefined, login.cookie);
      assert.equal(me.body.user.email, alice.email);
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
