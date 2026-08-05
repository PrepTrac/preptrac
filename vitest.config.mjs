import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const srcDirectory = fileURLToPath(new URL("./src", import.meta.url));

// Two test projects: node tests stay in node env, component (.tsx) tests run in
// jsdom. Coverage is collected across both. Thresholds gate regressions.
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
    alias: {
      "~": srcDirectory,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/generated/**",
        "src/env.mjs",
        "src/app/api/**",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/not-found.tsx",
        "src/app/providers.tsx",
        "src/components/ServiceWorkerRegister.tsx",
        "src/server/db.ts",
        "src/server/auth.ts",
        "next-env.d.ts",
        "**/*.d.ts",
      ],
      // Regression-guard thresholds: set at current measured coverage so CI
      // fails if coverage drops, without blocking the initial rollout. Ratchet
      // upward as test coverage grows.
      thresholds: {
        lines: 15,
        functions: 10,
        branches: 10,
        statements: 15,
      },
    },
  },
});
