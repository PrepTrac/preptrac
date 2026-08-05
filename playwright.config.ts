import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration. Runs smoke workflows against the Next.js dev
 * (or preview) server and includes automated axe-core accessibility checks.
 *
 * Browsers are NOT installed in this environment; `npx playwright install` must
 * run once (or in CI) before `npm run test:e2e`. CI gates on this job.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.CI
    ? {
        command:
          "npm run build && cp -R .next/static .next/standalone/.next/ && cp -R public .next/standalone/ && node .next/standalone/server.js",
        url: "http://localhost:3000",
        timeout: 120_000,
        reuseExistingServer: false,
        env: {
          DATABASE_URL: process.env.DATABASE_URL ?? "file:./e2e.db",
        },
      }
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        timeout: 120_000,
        reuseExistingServer: true,
      },
});
