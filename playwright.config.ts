import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.e2e.ts",
  workers: 1,
  expect: { timeout: 15000 },
  timeout: 60000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
    channel: "chrome",
    headless: true,
    viewport: { width: 1536, height: 1024 },
  },
  reporter: "list",
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "node scripts/start-test-server.mjs",
        url: "http://localhost:3100/api/health",
        timeout: 180000,
        reuseExistingServer: false,
        env: {
          AI_MODE: "local",
          DATA_MODE: "demo",
          UZEX_TEST_SERVER: "1",
          VERCEL: "",
          APP_API_KEY: "",
        },
      },
});
