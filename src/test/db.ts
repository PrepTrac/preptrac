import type { PrismaClient } from "~/generated/prisma/client";
import { createPrismaClient } from "~/server/prismaClient";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Create an isolated SQLite database in a temp directory with the current
 * Prisma schema applied. Each call returns a fresh PrismaClient so tests are
 * fully isolated (no shared state, no risk to the dev database).
 *
 * Used by router integration tests that exercise real Prisma queries —
 * including ownership-scoping regressions — through `appRouter.createCaller`.
 */
export interface TestDbHandle {
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDbHandle> {
  const dir = mkdtempSync(join(tmpdir(), "preptrac-test-"));
  const dbPath = join(dir, "test.db");
  const url = `file:${dbPath}`;

  // Apply the schema to the temp database. Prisma 7 no longer generates the
  // client as part of `db push`; --accept-data-loss is harmless on a fresh DB.
  execSync(`npx prisma db push --accept-data-loss`, {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url },
  });

  const prisma = createPrismaClient(url);

  return {
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Create a user directly in the test database and return its id. Bypasses the
 * router/auth so integration tests control exactly which user owns which rows.
 */
export async function createTestUser(
  prisma: PrismaClient,
  email: string,
): Promise<string> {
  const user = await prisma.user.create({
    data: { email, password: "", name: email },
    select: { id: true },
  });
  return user.id;
}
