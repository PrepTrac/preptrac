/**
 * Application mode, controlled by the {@link https://nextjs.org|Next.js} runtime
 * env var `PREPTRAC_MODE`.
 *
 *   `demo`   -> pre-seeded sample data AND read-only (every API mutation is rejected)
 *   `seeded` -> pre-seeded sample data with full usage (writes allowed)
 *   `clean`  -> (default) empty slate; nothing is seeded, writes allowed
 *
 * Unset, empty, or unrecognized values normalize to `"clean"` so a typo never
 * prevents the app from starting. The value is read live from `process.env`
 * (intentionally not cached) so tests can flip it between cases; the only cost
 * is one string compare, and it is evaluated solely on mutation requests
 * (see `enforceReadOnly` in `src/server/api/trpc.ts`).
 *
 * Design note: we read `process.env` directly instead of the frozen, zod-parsed
 * `env` object so the value stays live and unit-testable without module reloads.
 */
export type AppMode = "demo" | "seeded" | "clean";

/** Pure normalization of a raw env value into one of the three modes. */
export function normalizeMode(raw: string | null | undefined): AppMode {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "demo" || value === "seeded" || value === "clean") {
    return value;
  }
  return "clean";
}

let warnedAboutInvalidValue = false;

/** Current app mode from the environment (read live; not cached). */
export function getAppMode(): AppMode {
  const raw = process.env.PREPTRAC_MODE;
  const mode = normalizeMode(raw);
  // Warn once if a non-empty value was provided that we did not recognize, so a
  // misconfigured deploy is noticeable instead of silently running in clean mode.
  if (
    mode === "clean" &&
    typeof raw === "string" &&
    raw.trim() !== "" &&
    !warnedAboutInvalidValue
  ) {
    warnedAboutInvalidValue = true;
    console.warn(
      `PREPTRAC_MODE=${JSON.stringify(raw)} is not recognized (expected "demo", "seeded", or "clean"). Falling back to "clean".`,
    );
  }
  return mode;
}

/** True only in demo mode, where all API mutations are rejected. */
export function isReadOnly(): boolean {
  return getAppMode() === "demo";
}

/** True when the app should be auto-seeded with sample data (demo or seeded). */
export function shouldSeed(): boolean {
  const mode = getAppMode();
  return mode === "demo" || mode === "seeded";
}
