import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Shared secret that gates the /api/cron/notifications runner. Optional at boot
  // (the app still starts), but the cron endpoint rejects requests when unset.
  CRON_SECRET: z.string().optional(),
  // App mode toggle. "demo" = pre-seeded sample data AND read-only,
  // "seeded" = pre-seeded sample data with full usage, "clean" (or unset/empty)
  // = normal empty slate. Unrecognized values fall back to "clean" at runtime
  // (see src/server/appMode.ts) so a bad value never blocks startup.
  PREPTRAC_MODE: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = Object.keys(parsed.error.flatten().fieldErrors);
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  console.error("Missing variables:", missing);
  console.error("Please check your .env file and ensure all required variables are set.");
  throw new Error(`Invalid environment variables: ${missing.join(", ")}`);
}

export const env = parsed.data;

