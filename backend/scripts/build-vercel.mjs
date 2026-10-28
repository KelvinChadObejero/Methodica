import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/vercel/server.mjs",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  banner: {
    js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
  },
});
await mkdir("dist/vercel", { recursive: true });
// Vercel collects its entry under a CJS package scope. Keep the actual server
// ESM (required by Better Auth) and load it through a tiny native CJS bridge.
await writeFile(
  "dist/vercel/index.cjs",
  `let handler;
module.exports = async (req, res) => {
  try {
    handler ||= import("./server.mjs").then(module => module.default);
    return (await handler)(req, res);
  } catch {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "The study service could not start. Please try again." }));
  }
};
`
);
