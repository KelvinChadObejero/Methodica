import { startPrismaDevServer } from "@prisma/dev";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// A real local PostgreSQL-compatible server, never a hosted storage fallback.
const postgres = await startPrismaDevServer({
  name: "methodica-local",
  persistenceMode: "stateful",
});
await mkdir("data", { recursive: true });
let secret;
try {
  secret = await readFile("data/local-auth-secret", "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  secret = randomBytes(48).toString("base64url");
  await writeFile("data/local-auth-secret", secret, { mode: 0o600, flag: "wx" });
}
const env = {
  ...process.env,
  DATABASE_URL: postgres.database.connectionString,
  LOCAL_PRISMA_DEV: "true",
  BETTER_AUTH_SECRET: secret,
  BETTER_AUTH_URL: "http://localhost:5173",
};
delete env.VERCEL;
try {
  await promisify(execFile)(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env }
  );
  const child = spawn(process.execPath, ["--import", "tsx", "--watch", "src/index.ts"], {
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  const stop = () => child.kill();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  await new Promise((resolve) => child.once("exit", resolve));
} finally {
  await postgres.close();
}
