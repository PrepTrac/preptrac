import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createTestDb, createTestUser, type TestDbHandle } from "~/test/db";
import { seedDemoData } from "~/server/seedData";

/**
 * Verifies the shared sample-data seeder (refactored out of settings.fillTestData)
 * and the idempotency/auto-seed behavior of `ensureSeededOnce`.
 *
 * `ensureSeededOnce` carries a process-level guard (`seedCheckedThisProcess`) so
 * its DB check runs at most once per Node process. To test the marker-based
 * idempotency across "restarts", each of those cases resets the module registry
 * and re-imports the function fresh, with PREPTRAC_MODE set appropriately.
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

describe("seedDemoData", () => {
  it("creates the full sample dataset and records the test-data marker", async () => {
    const userId = await createTestUser(handle.prisma, `seed-${Math.random()}@test`);
    const result = await seedDemoData(handle.prisma, userId);

    // Every part of the app is represented in the seed.
    expect(result.categories).toBe(10);
    expect(result.locations).toBe(5);
    expect(result.items).toBe(35);
    expect(result.familyMembers).toBe(4);
    expect(result.consumptionLogs).toBeGreaterThan(0);
    expect(result.additionLogs).toBeGreaterThan(0);
    expect(result.activityLevelSet).toBe(true);
    expect(result.goalsSet).toBe(true);

    // Rows actually persisted, and the TestDataRecord marker exists.
    expect(await handle.prisma.item.count({ where: { userId } })).toBe(35);
    expect(
      await handle.prisma.testDataRecord.count({ where: { userId } }),
    ).toBeGreaterThan(0);

    // Goals were written to the user.
    const user = await handle.prisma.user.findUnique({
      where: { id: userId },
      select: { ammoGoalRounds: true, foodGoalDays: true, activityLevel: true },
    });
    expect(user?.ammoGoalRounds).toBe(1500);
    expect(user?.foodGoalDays).toBe(90);
    expect(user?.activityLevel).toBe("moderate");
  });
});

describe("ensureSeededOnce", () => {
  it("does nothing when PREPTRAC_MODE is clean", async () => {
    vi.resetModules();
    process.env.PREPTRAC_MODE = "clean";
    const { ensureSeededOnce } = await import("~/server/seedData");
    const userId = await createTestUser(handle.prisma, `clean-${Math.random()}@test`);
    await ensureSeededOnce(handle.prisma, userId);
    expect(await handle.prisma.item.count({ where: { userId } })).toBe(0);
  });

  it("seeds when in seeded mode, then a fresh process skips via the marker", async () => {
    // First "boot": no marker yet -> seeds.
    vi.resetModules();
    process.env.PREPTRAC_MODE = "seeded";
    const userId = await createTestUser(handle.prisma, `ens-${Math.random()}@test`);
    const firstBoot = await import("~/server/seedData");
    await firstBoot.ensureSeededOnce(handle.prisma, userId);
    expect(await handle.prisma.item.count({ where: { userId } })).toBe(35);

    // Second "boot" (fresh module: process guard is unset again). The
    // TestDataRecord marker is present, so it must NOT re-seed/duplicate.
    vi.resetModules();
    const secondBoot = await import("~/server/seedData");
    await secondBoot.ensureSeededOnce(handle.prisma, userId);
    expect(await handle.prisma.item.count({ where: { userId } })).toBe(35);
  });
});
