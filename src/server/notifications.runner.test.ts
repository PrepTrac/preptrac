import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "~/generated/prisma/client";

// Mock the webhook delivery so tests control success/failure without network.
vi.mock("~/utils/webhooks", () => ({
  sendWebhook: vi.fn(),
}));
import { sendWebhook } from "~/utils/webhooks";
import {
  runScheduledNotifications,
  dedupKey,
  dayKey,
  MAX_RETRY_ATTEMPTS,
  RETRY_WINDOW_MS,
  type AlertableItem,
} from "./notifications";

const mockedSendWebhook = vi.mocked(sendWebhook);

/** Build the P2002 unique-constraint error exactly as Prisma would throw it. */
function p2002() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.0.0",
  });
}

interface LogRow {
  id: string;
  userId: string;
  dedupKey: string;
  channel: string;
  type: string;
  itemId: string | null;
  message: string;
  success: boolean;
  attemptCount: number;
  error: string | null;
  sentAt: Date;
}

/**
 * Minimal in-memory PrismaClient covering only the surface the runner uses.
 * The notificationLog table is keyed by the unique dedupKey and emulates the
 * P2002 unique-violation on a duplicate insert.
 */
function makeFakeClient(users: { id: string; email: string }[]) {
  const settings = new Map<string, Record<string, unknown>>();
  const itemsByUser = new Map<string, unknown[]>();
  const logs = new Map<string, LogRow>();
  let idSeq = 0;

  const client = {
    user: {
      findMany: async () => users,
    },
    notificationSettings: {
      findUnique: async ({ where }: { where: { userId: string } }) =>
        settings.get(where.userId) ?? null,
    },
    item: {
      findMany: async ({ where }: { where: { userId: string } }) =>
        itemsByUser.get(where.userId) ?? [],
    },
    notificationLog: {
      create: async ({ data }: { data: Partial<LogRow> & { dedupKey: string } }) => {
        if (logs.has(data.dedupKey)) throw p2002();
        const row: LogRow = {
          id: `log-${++idSeq}`,
          userId: data.userId!,
          dedupKey: data.dedupKey,
          channel: data.channel!,
          type: data.type!,
          itemId: data.itemId ?? null,
          message: data.message!,
          success: data.success ?? false,
          attemptCount: data.attemptCount ?? 0,
          error: data.error ?? null,
          sentAt: data.sentAt ?? new Date(0),
        };
        logs.set(row.dedupKey, row);
        return { ...row };
      },
      findUnique: async ({ where }: { where: { dedupKey: string } }) => {
        const row = logs.get(where.dedupKey);
        return row ? { ...row } : null;
      },
      update: async ({
        where,
        data,
      }: {
        where: { dedupKey: string };
        data: Partial<LogRow>;
      }) => {
        const row = logs.get(where.dedupKey);
        if (!row) throw new Error("row missing");
        Object.assign(row, data);
        return { ...row };
      },
    },
  };

  return {
    client,
    seedSettings: (userId: string, s: Record<string, unknown>) => settings.set(userId, s),
    seedItems: (userId: string, items: unknown[]) => itemsByUser.set(userId, items),
    getLog: (key: string) => logs.get(key),
    allLogs: () => Array.from(logs.values()),
  };
}

const NOW = new Date("2026-01-10T00:00:00.000Z");

function webhookSettings(overrides: Record<string, unknown> = {}) {
  return {
    emailEnabled: false,
    webhookEnabled: true,
    webhookUrl: "https://example.test/hook",
    webhookSecret: null,
    webhookExpirationDays: 7,
    webhookMaintenanceDays: 3,
    webhookRotationDays: 1,
    webhookLowInventory: false,
    ...overrides,
  };
}

function expiringItem(id: string, daysOut: number, now: Date) {
  const expirationDate = new Date(now.getTime() + daysOut * 24 * 60 * 60 * 1000);
  const item = {
    id,
    name: `Item ${id}`,
    quantity: 1,
    unit: "can",
    minQuantity: 0,
    expirationDate,
    maintenanceInterval: null,
    lastMaintenanceDate: null,
    rotationSchedule: null,
    lastRotationDate: null,
    category: { name: "Food", kind: "food" },
    location: { name: "Pantry" },
  };
  return { item, dedup: `u1:webhook:expiration:${id}:${dayKey(expirationDate)}` };
}

beforeEach(() => {
  mockedSendWebhook.mockReset();
});

describe("runScheduledNotifications — delivery + dedup", () => {
  it("delivers a due alert once and skips it on a re-run (dedup holds)", async () => {
    const env = makeFakeClient([{ id: "u1", email: "u1@test" }]);
    env.seedSettings("u1", webhookSettings());
    const { item } = expiringItem("i1", 3, NOW);
    env.seedItems("u1", [item]);
    mockedSendWebhook.mockResolvedValue({ success: true });

    const r1 = await runScheduledNotifications(env.client as never, NOW);
    expect(r1.sent).toBe(1);
    expect(r1.skipped).toBe(0);

    const r2 = await runScheduledNotifications(env.client as never, NOW);
    expect(r2.sent).toBe(0);
    expect(r2.skipped).toBe(1);

    // Exactly one log row, recorded as a success.
    expect(env.allLogs()).toHaveLength(1);
    expect(env.allLogs()[0]!.success).toBe(true);
  });

  it("does not send for a disabled channel", async () => {
    const env = makeFakeClient([{ id: "u1", email: "u1@test" }]);
    env.seedSettings("u1", webhookSettings({ webhookEnabled: false }));
    const { item } = expiringItem("i1", 3, NOW);
    env.seedItems("u1", [item]);

    const r = await runScheduledNotifications(env.client as never, NOW);
    expect(r.sent).toBe(0);
    expect(env.allLogs()).toHaveLength(0);
  });
});

describe("runScheduledNotifications — transient failure retry", () => {
  it("does not retry before the retry window elapses", async () => {
    const env = makeFakeClient([{ id: "u1", email: "u1@test" }]);
    env.seedSettings("u1", webhookSettings());
    const { item, dedup } = expiringItem("i1", 3, NOW);
    env.seedItems("u1", [item]);
    mockedSendWebhook.mockResolvedValue({ success: false, error: "boom" });

    const r1 = await runScheduledNotifications(env.client as never, NOW);
    expect(r1.sent).toBe(0);
    expect(r1.errors).toHaveLength(1);
    expect(env.getLog(dedup)?.success).toBe(false);
    expect(env.getLog(dedup)?.attemptCount).toBe(1);

    const shortlyAfter = new Date(NOW.getTime() + 1000);
    const r2 = await runScheduledNotifications(env.client as never, shortlyAfter);
    expect(r2.sent).toBe(0);
    expect(r2.skipped).toBe(1);
    expect(mockedSendWebhook).toHaveBeenCalledTimes(1);
  });

  it("retries after the window elapses and records success (dedup preserved)", async () => {
    const env = makeFakeClient([{ id: "u1", email: "u1@test" }]);
    env.seedSettings("u1", webhookSettings());
    const { item, dedup } = expiringItem("i1", 3, NOW);
    env.seedItems("u1", [item]);

    mockedSendWebhook.mockResolvedValue({ success: false, error: "down" });
    await runScheduledNotifications(env.client as never, NOW);
    expect(env.getLog(dedup)?.attemptCount).toBe(1);

    mockedSendWebhook.mockResolvedValue({ success: true });
    const later = new Date(NOW.getTime() + RETRY_WINDOW_MS + 1);
    const r2 = await runScheduledNotifications(env.client as never, later);
    expect(r2.sent).toBe(1);
    expect(r2.retried).toBe(1);
    expect(env.getLog(dedup)?.success).toBe(true);
    expect(env.getLog(dedup)?.attemptCount).toBe(2);

    // A further run must NOT redeliver (dedup holds for the now-successful alert).
    const r3 = await runScheduledNotifications(env.client as never, later);
    expect(r3.sent).toBe(0);
    expect(r3.skipped).toBe(1);
    expect(mockedSendWebhook).toHaveBeenCalledTimes(2);
  });

  it("stops retrying after MAX_RETRY_ATTEMPTS", async () => {
    const env = makeFakeClient([{ id: "u1", email: "u1@test" }]);
    env.seedSettings("u1", webhookSettings());
    const { item, dedup } = expiringItem("i1", 3, NOW);
    env.seedItems("u1", [item]);
    mockedSendWebhook.mockResolvedValue({ success: false, error: "perm" });

    let t = NOW.getTime();
    for (let i = 0; i < MAX_RETRY_ATTEMPTS; i++) {
      t += RETRY_WINDOW_MS + 1;
      await runScheduledNotifications(env.client as never, new Date(t));
    }
    // attemptCount starts at 0 on claim; first delivery sets it to 1, so after
    // MAX_RETRY_ATTEMPTS deliveries the cap is reached.
    expect(env.getLog(dedup)?.attemptCount).toBe(MAX_RETRY_ATTEMPTS);
    expect(mockedSendWebhook).toHaveBeenCalledTimes(MAX_RETRY_ATTEMPTS);

    // One more run after the cap: no further attempt, just skipped.
    t += RETRY_WINDOW_MS + 1;
    const after = await runScheduledNotifications(env.client as never, new Date(t));
    expect(mockedSendWebhook).toHaveBeenCalledTimes(MAX_RETRY_ATTEMPTS);
    expect(after.sent).toBe(0);
    expect(after.skipped).toBe(1);
  });
});

describe("dedupKey / dayKey sanity for runner tests", () => {
  it("matches the key the runner builds for an expiration alert", () => {
    const alert: { type: "expiration"; message: string; date: Date; itemId: string } = {
      type: "expiration",
      message: "x",
      date: new Date("2026-01-13T00:00:00.000Z"),
      itemId: "i1",
    };
    expect(dedupKey("u1", "webhook", alert as never)).toBe(
      "u1:webhook:expiration:i1:2026-01-13",
    );
  });
});

// AlertableItem is imported only to keep the type in scope for readers; the fake
// client returns untyped rows that the runner narrows itself.
void (null as unknown as AlertableItem);
