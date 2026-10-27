import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/vercel/index.cjs",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  packages: "external",
  footer: { js: "module.exports = module.exports.default;" },
});
