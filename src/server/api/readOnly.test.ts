import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { appRouter } from "~/server/api/root";
import { createTestDb, createTestUser, type TestDbHandle } from "~/test/db";

/**
 * Integration test for read-only enforcement: the `enforceReadOnly` middleware
 * on `protectedProcedure` must reject every mutation when PREPTRAC_MODE is
 * `demo`, while still allowing queries; `seeded` and `clean` allow mutations.
 *
 * The middleware reads the mode live from process.env, so we flip the var
 * between cases and reset it afterwards. We call the real appRouter via
 * createCaller (bypassing context creation, so no auto-seeding occurs).
 */
let handle: TestDbHandle;
const originalMode = process.env.PREPTRAC_MODE;

beforeAll(async () => {
  handle = await createTestDb();
});

afterAll(async () => {
  if (originalMode === undefined) delete process.env.PREPTRAC_MODE;
  else process.env.PREPTRAC_MODE = originalMode;
  await handle.cleanup();
});

afterEach(() => {
  // Always reset to clean between cases so mode never leaks across tests.
  delete process.env.PREPTRAC_MODE;
});

async function seedCategoryAndLocation(userId: string) {
  const tag = userId.slice(-4);
  const [category, location] = await Promise.all([
    handle.prisma.category.create({ data: { name: `Cat-${tag}`, userId } }),
    handle.prisma.location.create({ data: { name: `Loc-${tag}`, userId } }),
  ]);
  return { category, location };
}

function callerFor(userId: string) {
  return appRouter.createCaller({ userId, prisma: handle.prisma });
}

describe("read-only enforcement (PREPTRAC_MODE)", () => {
  it("blocks mutations in demo mode", async () => {
    process.env.PREPTRAC_MODE = "demo";
    const userId = await createTestUser(handle.prisma, `demo-${Math.random()}@test`);
    const { category, location } = await seedCategoryAndLocation(userId);
    const caller = callerFor(userId);

    await expect(
      caller.items.create({
        name: "Blocked",
        quantity: 1,
        unit: "cans",
        categoryId: category.id,
        locationId: location.id,
      }),
    ).rejects.toThrow(/read-only/i);
  });

  it("still allows queries in demo mode", async () => {
    process.env.PREPTRAC_MODE = "demo";
    const userId = await createTestUser(handle.prisma, `demo-q-${Math.random()}@test`);
    const caller = callerFor(userId);

    // A query must not be blocked by the read-only guard.
    const all = await caller.items.getAll();
    expect(Array.isArray(all)).toBe(true);
  });

  it("allows mutations in seeded mode", async () => {
    process.env.PREPTRAC_MODE = "seeded";
    const userId = await createTestUser(handle.prisma, `seeded-${Math.random()}@test`);
    const { category, location } = await seedCategoryAndLocation(userId);
    const caller = callerFor(userId);

    const created = await caller.items.create({
      name: "Allowed",
      quantity: 2,
      unit: "cans",
      categoryId: category.id,
      locationId: location.id,
    });
    expect(created.name).toBe("Allowed");
  });

  it("allows mutations in clean mode (default)", async () => {
    delete process.env.PREPTRAC_MODE;
    const userId = await createTestUser(handle.prisma, `clean-${Math.random()}@test`);
    const { category, location } = await seedCategoryAndLocation(userId);
    const caller = callerFor(userId);

    const created = await caller.items.create({
      name: "Default",
      quantity: 3,
      unit: "cans",
      categoryId: category.id,
      locationId: location.id,
    });
    expect(created.name).toBe("Default");
  });
});
