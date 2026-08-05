import type { PrismaClient } from "~/generated/prisma/client";
import { env } from "~/env.mjs";
import { createPrismaClient } from "~/server/prismaClient";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient(env.DATABASE_URL, {
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

