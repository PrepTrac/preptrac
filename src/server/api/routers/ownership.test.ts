import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "~/server/api/root";
import { createTestDb, createTestUser, type TestDbHandle } from "~/test/db";

let handle: TestDbHandle;

beforeAll(async () => {
  handle = await createTestDb();
});

afterAll(async () => {
  await handle.cleanup();
});

function callerFor(userId: string) {
  return appRouter.createCaller({ userId, prisma: handle.prisma });
}

describe("categories router — ownership scoping", () => {
  it("getAll excludes other users' categories", async () => {
    const a = await createTestUser(handle.prisma, `cat-a-${Math.random()}@test`);
    const b = await createTestUser(handle.prisma, `cat-b-${Math.random()}@test`);
    const catA = await handle.prisma.category.create({
      data: { name: "Ammo-A", userId: a },
    });
    const listB = await callerFor(b).categories.getAll();
    expect(listB.find((c) => c.id === catA.id)).toBeUndefined();
  });

  it("update/delete on another user's category fails and is a no-op", async () => {
    const a = await createTestUser(handle.prisma, `cat-up-a-${Math.random()}@test`);
    const b = await createTestUser(handle.prisma, `cat-up-b-${Math.random()}@test`);
    const catA = await handle.prisma.category.create({
      data: { name: "Food-A", userId: a },
    });
    const callerB = callerFor(b);
    await expect(
      callerB.categories.update({ id: catA.id, name: "Hacked" }),
    ).rejects.toThrow(/Category not found/);
    await expect(
      callerB.categories.delete({ id: catA.id }),
    ).rejects.toThrow(/Category not found/);
    const stillThere = await handle.prisma.category.findUnique({
      where: { id: catA.id },
    });
    expect(stillThere?.name).toBe("Food-A");
  });
});

describe("locations router — ownership scoping", () => {
  it("update/delete on another user's location fails and is a no-op", async () => {
    const a = await createTestUser(handle.prisma, `loc-a-${Math.random()}@test`);
    const b = await createTestUser(handle.prisma, `loc-b-${Math.random()}@test`);
    const locA = await handle.prisma.location.create({
      data: { name: "Home-A", userId: a },
    });
    const callerB = callerFor(b);
    await expect(
      callerB.locations.update({ id: locA.id, name: "Hacked" }),
    ).rejects.toThrow(/Location not found/);
    await expect(
      callerB.locations.delete({ id: locA.id }),
    ).rejects.toThrow(/Location not found/);
    const stillThere = await handle.prisma.location.findUnique({
      where: { id: locA.id },
    });
    expect(stillThere?.name).toBe("Home-A");
  });
});

describe("household router — ownership scoping", () => {
  it("delete on another user's family member fails and is a no-op", async () => {
    const a = await createTestUser(handle.prisma, `hh-a-${Math.random()}@test`);
    const b = await createTestUser(handle.prisma, `hh-b-${Math.random()}@test`);
    const memberA = await handle.prisma.familyMember.create({
      data: {
        userId: a,
        name: "Mom",
        age: 40,
        weightKg: 70,
        heightCm: 165,
        sex: "female",
      },
    });
    const callerB = callerFor(b);
    await expect(
      callerB.household.delete({ id: memberA.id }),
    ).rejects.toThrow(/Family member not found/);
    const stillThere = await handle.prisma.familyMember.findUnique({
      where: { id: memberA.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it("getAll only returns the caller's members", async () => {
    const a = await createTestUser(handle.prisma, `hh2-a-${Math.random()}@test`);
    const b = await createTestUser(handle.prisma, `hh2-b-${Math.random()}@test`);
    await handle.prisma.familyMember.create({
      data: {
        userId: a,
        name: "Dad",
        age: 42,
        weightKg: 80,
        heightCm: 178,
        sex: "male",
      },
    });
    const listB = await callerFor(b).household.getAll();
    expect(listB).toHaveLength(0);
  });
});
