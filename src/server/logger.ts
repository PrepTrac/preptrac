/**
 * Structured server logger.
 *
 * Emits one JSON object per line on a single stream so logs are machine-parseable
 * (level, timestamp, message, and arbitrary context). Dependency-free on purpose:
 * it keeps the bundle small, works under Next.js standalone, and avoids pulling a
 * runtime logger config. Severity is controlled by `LOG_LEVEL` (default "info").
 *
 * Intended for server modules only (route handlers, tRPC context, background
 * jobs). Client components keep using `console.*` directly.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function configuredLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return raw in LEVEL_PRIORITY ? (raw as LogLevel) : "info";
}

/** Read the level lazily so tests / hot reloads pick up env changes. */
let cachedLevel: LogLevel | null = null;
function currentLevel(): LogLevel {
  if (cachedLevel === null) cachedLevel = configuredLevel();
  return cachedLevel;
}

/** Exposed for tests; the app reads from `process.env.LOG_LEVEL`. */
export function __resetLogLevelCache(): void {
  cachedLevel = null;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel()]) return;

  const record: Record<string, unknown> = {
    level,
    timestamp: new Date().toISOString(),
    message,
  };
  if (context) {
    for (const [key, value] of Object.entries(context)) {
      // Avoid clobbering the core fields and skip `undefined` values.
      if (value !== undefined && !(key in record)) {
        record[key] = value;
      }
    }
  }

  // Error objects serialize usefully when stringified directly.
  const line = JSON.stringify(record);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    emit("debug", message, context);
  },
  info(message: string, context?: Record<string, unknown>): void {
    emit("info", message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    emit("warn", message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    emit("error", message, context);
  },
};

export type { LogLevel };
