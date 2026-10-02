import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Never reuse a user's running server or database for browser workflows.
const databaseUrl = `file:${join(mkdtempSync(join(tmpdir(), "preptrac-e2e-")), "test.db")}`;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const port = new URL(baseURL).port || "3100";
const testMode = process.env.PREPTRAC_E2E_MODE ?? "seeded";

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
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.CI
    ? {
        command:
          "npx prisma migrate deploy && npm run build && cp -R .next/static .next/standalone/.next/ && cp -R public .next/standalone/ && node .next/standalone/server.js",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: false,
        env: {
          DATABASE_URL: databaseUrl,
          PORT: port,
          PREPTRAC_MODE: testMode,
        },
      }
    : {
        command: `npx prisma migrate deploy && npm run dev -- --port ${port}`,
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: false,
        env: { DATABASE_URL: databaseUrl, PREPTRAC_MODE: testMode },
      },
});
