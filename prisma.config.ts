import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Generation does not need a live database, so builds can use this local
    // fallback. Runtime and migration commands set DATABASE_URL explicitly.
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
