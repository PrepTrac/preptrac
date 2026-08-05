import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
import { appRouter } from "~/server/api/root";
import { createTestDb, createTestUser, type TestDbHandle } from "~/test/db";

/**
 * Router integration tests against a real SQLite database (per-run temp file).
 * These exercise the actual Prisma queries and — critically — the ownership
 * scoping (`where: { id, userId }`) that prevents one user from mutating another
 * user's rows.
 */
let handle: TestDbHandle;

beforeAll(async () => {
  handle = await createTestDb();
});

afterAll(async () => {
  await handle.cleanup();
});

async function seed(userId: string) {
  const [category, location] = await Promise.all([
    handle.prisma.category.create({
      data: { name: `Cat-${userId.slice(-4)}`, userId },
    }),
    handle.prisma.location.create({
      data: { name: `Loc-${userId.slice(-4)}`, userId },
    }),
  ]);
  return { category, location };
}

/** Caller scoped to a single user. */
function callerFor(userId: string) {
  return appRouter.createCaller({ userId, prisma: handle.prisma });
}

describe("items router — CRUD happy path", () => {
  let userA: string;

  beforeEach(async () => {
    userA = await createTestUser(handle.prisma, `a-${Math.random()}@test`);
    // Clean items for isolation.
    await handle.prisma.item.deleteMany({});
  });

  it("creates, lists, updates, and deletes an item for the owner", async () => {
    const { category, location } = await seed(userA);
    const caller = callerFor(userA);

    const created = await caller.items.create({
      name: "Canned Beans",
      quantity: 10,
      unit: "cans",
      categoryId: category.id,
      locationId: location.id,
      minQuantity: 2,
    });
    expect(created.name).toBe("Canned Beans");

    const all = await caller.items.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe(created.id);

    const updated = await caller.items.update({
      id: created.id,
      quantity: 7,
    });
    expect(updated.quantity).toBe(7);

    const deleted = await caller.items.delete({ id: created.id });
    expect(deleted.success).toBe(true);
    const remaining = await caller.items.getAll();
    expect(remaining).toHaveLength(0);
  });

  it("blocks consuming more than available stock", async () => {
    const { category, location } = await seed(userA);
    const caller = callerFor(userA);
    const created = await caller.items.create({
      name: "Water",
      quantity: 5,
      unit: "gallons",
      categoryId: category.id,
      locationId: location.id,
    });
    await expect(
      caller.items.consume({ itemId: created.id, quantity: 6 }),
    ).rejects.toThrow(/Not enough quantity/);
  });

  it("consumeMany rejects the whole batch if any entry is invalid", async () => {
    const { category, location } = await seed(userA);
    const caller = callerFor(userA);
    const ok = await caller.items.create({
      name: "Ok",
      quantity: 10,
      unit: "cans",
      categoryId: category.id,
      locationId: location.id,
    });
    const low = await caller.items.create({
      name: "Low",
      quantity: 1,
      unit: "cans",
      categoryId: category.id,
      locationId: location.id,
    });
    await expect(
      caller.items.consumeMany({
        activityType: "consumption",
        entries: [
          { itemId: ok.id, quantity: 2 },
          { itemId: low.id, quantity: 5 }, // exceeds stock
        ],
      }),
    ).rejects.toThrow();
    // Nothing applied (atomic).
    const items = await caller.items.getAll();
    expect(items.find((i) => i.id === ok.id)!.quantity).toBe(10);
    expect(items.find((i) => i.id === low.id)!.quantity).toBe(1);
  });
});

describe("items router — ownership scoping regressions", () => {
  let userA: string;
  let userB: string;
  let itemA: { id: string };
  let callerB: ReturnType<typeof callerFor>;

  beforeEach(async () => {
    userA = await createTestUser(handle.prisma, `owner-${Math.random()}@test`);
    userB = await createTestUser(handle.prisma, `intruder-${Math.random()}@test`);
    const { category, location } = await seed(userA);
    const callerA = callerFor(userA);
    itemA = await callerA.items.create({
      name: "Owner's Ammo",
      quantity: 100,
      unit: "rounds",
      categoryId: category.id,
      locationId: location.id,
    });
    callerB = callerFor(userB);
  });

  it("getAll never returns another user's items", async () => {
    const list = await callerB.items.getAll();
    expect(list.find((i) => i.id === itemA.id)).toBeUndefined();
  });

  it("getById returns null for another user's item", async () => {
    const result = await callerB.items.getById({ id: itemA.id });
    expect(result).toBeNull();
  });

  it("update throws and does not mutate another user's item", async () => {
    await expect(
      callerB.items.update({ id: itemA.id, quantity: 0 }),
    ).rejects.toThrow(/Item not found/);
    const stillThere = await handle.prisma.item.findUnique({
      where: { id: itemA.id },
    });
    expect(stillThere?.quantity).toBe(100);
  });

  it("delete throws and does not remove another user's item", async () => {
    await expect(
      callerB.items.delete({ id: itemA.id }),
    ).rejects.toThrow(/Item not found/);
    const stillThere = await handle.prisma.item.findUnique({
      where: { id: itemA.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it("consume throws for another user's item", async () => {
    await expect(
      callerB.items.consume({ itemId: itemA.id, quantity: 1 }),
    ).rejects.toThrow(/Item not found/);
  });
});
