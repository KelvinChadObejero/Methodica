import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 10000 },
  retries: 0,
  use: {
    actionTimeout: 15000,
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node --import tsx scripts/dev-e2e.mjs",
      cwd: "../backend",
      url: "http://127.0.0.1:4100/api/health",
      timeout: 90000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5174",
      url: "http://127.0.0.1:5174",
      env: { METHODICA_API_TARGET: "http://127.0.0.1:4100" },
      reuseExistingServer: false,
    },
  ],
});
