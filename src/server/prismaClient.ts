import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "~/generated/prisma/client";

/**
 * Create a Prisma 7 client backed by SQLite's required driver adapter.
 * Keeping construction in one place ensures the app, scripts, and tests use the
 * same adapter semantics while still allowing isolated test database URLs.
 */
export function createPrismaClient(
  databaseUrl: string,
  options?: { log?: Array<"query" | "info" | "warn" | "error"> },
): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter, ...options });
}
