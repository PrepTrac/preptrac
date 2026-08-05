import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { env } from "~/env.mjs";
import { runScheduledNotifications } from "~/server/notifications";

export const dynamic = "force-dynamic";

/**
 * Scheduled notification runner.
 *
 * Invoked by a Coolify Scheduled Task (or any external scheduler) hitting e.g.
 *   GET https://your-host/api/cron/notifications
 *   Authorization: Bearer <CRON_SECRET>
 * Secrets are accepted only in the header so reverse-proxy access logs cannot
 * accidentally record them in a query string.
 *
 * The runner is idempotent: the NotificationLog dedup key guarantees each alert
 * is delivered at most once per (user, channel, type, item, event date), so a
 * retried or overlapping run produces no duplicates. See src/server/notifications.ts.
 */

/** Constant-time string comparison that is safe for unequal-length inputs. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare bufA to itself to keep timing roughly constant, then return false.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function providedSecret(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1]!.trim();
  }
  return null;
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const configured = env.CRON_SECRET;
  if (!configured) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured; set it before enabling scheduled notifications." },
      { status: 500 },
    );
  }

  const provided = providedSecret(request);
  if (!provided || !safeEqual(provided, configured)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runScheduledNotifications();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[cron/notifications] runner failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Runner failed" },
      { status: 500 },
    );
  }
}
