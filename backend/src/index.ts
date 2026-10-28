import { createApp } from "./app.js";
export { closeAccountServices } from "./auth.js";

const app = createApp(
  process.env.ALLOW_LOCAL_WORKSPACE === "true" && !process.env.VERCEL
    ? { dataFile: process.env.DATA_FILE || "data/workspace.json", accounts: null }
    : {}
);

// A production Node server must still listen; Vercel imports the exported app.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, "127.0.0.1", () => {
    console.log(`Methodica API listening on http://localhost:${port}`);
  });
}

export default app;
