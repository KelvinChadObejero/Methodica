// Disposable browser-test API. Never reads DATABASE_URL or a local .env file.
import { startPrismaDevServer } from "@prisma/dev";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { createDatabase, seedStudyTypes } from "../src/database.ts";
import { createAuthentication } from "../src/auth.ts";
import { createApp } from "../src/app.ts";

const postgres = await startPrismaDevServer({
  name: "methodica-browser-test",
  persistenceMode: "stateless",
  port: 0,
  databasePort: 0,
  shadowDatabasePort: 0,
  streamsPort: 0,
});
const db = createDatabase(postgres.database.connectionString, 1);
const origins = ["http://127.0.0.1:5174"];
try {
  await promisify(execFile)(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: { ...process.env, DATABASE_URL: postgres.database.connectionString },
      timeout: 30000,
    }
  );
  await seedStudyTypes(db);
  const auth = createAuthentication(db, randomBytes(48).toString("base64url"), origins);
  const server = createApp({ accounts: { db, auth, origins } }).listen(4100, "127.0.0.1", () =>
    console.log("Disposable browser-test API ready on 4100")
  );
  let stopping = false;
  const close = async () => {
    if (stopping) return;
    stopping = true;
    await new Promise((done) => server.close(done));
    await db.$disconnect();
    await postgres.close();
    process.exit(0);
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
} catch (error) {
  await db.$disconnect();
  await postgres.close();
  throw error;
}
