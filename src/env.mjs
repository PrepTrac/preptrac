import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
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

