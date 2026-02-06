import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { syncItemEvents } from "~/server/syncItemEvents";
import { z } from "zod";

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function subDays(d: Date, days: number) {
  return addDays(d, -days);
}

async function recordTestData(
  prisma: { testDataRecord: { create: (arg: { data: { userId: string; recordId: string; kind: string } }) => Promise<unknown> } },
  userId: string,
  recordId: string,
  kind: "category" | "location" | "item" | "consumption_log" | "event" | "family_member"
) {
  await prisma.testDataRecord.create({
    data: { userId, recordId, kind },
  });
}

const goalsInputSchema = z.object({
  ammoGoalRounds: z.number().min(0).optional().nullable(),
  waterGoalGallons: z.number().min(0).optional().nullable(),
  foodGoalDays: z.number().min(0).optional().nullable(),
  fuelGoalGallons: z.number().min(0).optional().nullable(),
});

export const settingsRouter = createTRPCRouter({
  getGoals: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        ammoGoalRounds: true,
        waterGoalGallons: true,
        foodGoalDays: true,
        fuelGoalGallons: true,
      },
    });
    return {
      ammoGoalRounds: user?.ammoGoalRounds ?? null,
      waterGoalGallons: user?.waterGoalGallons ?? null,
      foodGoalDays: user?.foodGoalDays ?? null,
      fuelGoalGallons: user?.fuelGoalGallons ?? null,
    };
  }),

  updateGoals: protectedProcedure
    .input(goalsInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: {
          ...(input.ammoGoalRounds !== undefined && { ammoGoalRounds: input.ammoGoalRounds }),
          ...(input.waterGoalGallons !== undefined && { waterGoalGallons: input.waterGoalGallons }),
          ...(input.foodGoalDays !== undefined && { foodGoalDays: input.foodGoalDays }),
          ...(input.fuelGoalGallons !== undefined && { fuelGoalGallons: input.fuelGoalGallons }),
        },
      });
      return { ok: true };
    }),

  fillTestData: protectedProcedure.mutation(async ({ ctx }) => {
    const prisma = ctx.prisma;
    const userId = ctx.userId;
    const now = new Date();

    // Ensure categories exist (get or create)
    const categoryNames = [
      { name: "Food", description: "Canned goods, MREs, dried food", color: "#F59E0B" },
      { name: "Water", description: "Water storage and purification", color: "#3B82F6" },
      { name: "Ammo", description: "Ammunition and reloading", color: "#EF4444" },
      { name: "Medical", description: "First aid and medications", color: "#10B981" },
      { name: "Tools", description: "Knives, multi-tools, equipment", color: "#6B7280" },
      { name: "Shelter", description: "Tents, tarps, sleeping gear", color: "#EC4899" },
      { name: "Fuel & Energy", description: "Gas, batteries, solar", color: "#F97316" },
      { name: "Communication", description: "Radios, signaling", color: "#06B6D4" },
      { name: "Hygiene", description: "Soap, toiletries", color: "#8B5CF6" },
      { name: "Defense", description: "Self-defense and security", color: "#DC2626" },
    ];
    const categoryIds: Record<string, string> = {};
    for (const cat of categoryNames) {
      let c = await prisma.category.findFirst({
        where: { userId, name: cat.name },
      });
      if (!c) {
        c = await prisma.category.create({
          data: { userId, name: cat.name, description: cat.description, color: cat.color },
        });
        await recordTestData(prisma, userId, c.id, "category");
      }
      categoryIds[cat.name] = c.id;
    }

    // Ensure locations exist
    const locationNames = [
      { name: "Home", description: "Primary residence" },
      { name: "Vehicle", description: "Primary vehicle" },
      { name: "Bug-out Bag", description: "Emergency go bag" },
      { name: "Cabin", description: "Retreat property" },
      { name: "Garage", description: "Garage storage" },
    ];
    const locationIds: Record<string, string> = {};
    for (const loc of locationNames) {
      let l = await prisma.location.findFirst({
        where: { userId, name: loc.name },
      });
      if (!l) {
        l = await prisma.location.create({
          data: { userId, name: loc.name, description: loc.description },
        });
        await recordTestData(prisma, userId, l.id, "location");
      }
      locationIds[loc.name] = l.id;
    }

    // Items: name, quantity, unit, category, location, optional dates, minQty, targetQty, caloriesPerUnit (for food)
    const itemDefs: Array<{
      name: string;
      description?: string;
      quantity: number;
      unit: string;
      category: string;
      location: string;
      expirationDate?: Date;
      maintenanceInterval?: number;
      lastMaintenanceDate?: Date;
      rotationSchedule?: number;
      lastRotationDate?: Date;
      minQuantity?: number;
      targetQuantity?: number;
      caloriesPerUnit?: number;
    }> = [
      { name: "Canned beans", quantity: 24, unit: "cans", category: "Food", location: "Home", expirationDate: addDays(now, 120), minQuantity: 6, targetQuantity: 30, caloriesPerUnit: 200 },
      { name: "Rice (long grain)", quantity: 20, unit: "lbs", category: "Food", location: "Home", expirationDate: addDays(now, 150), minQuantity: 5, caloriesPerUnit: 1700 },
      { name: "MREs", quantity: 12, unit: "meals", category: "Food", location: "Bug-out Bag", expirationDate: addDays(now, 90), minQuantity: 4, caloriesPerUnit: 1200 },
      { name: "Canned soup", quantity: 18, unit: "cans", category: "Food", location: "Home", expirationDate: addDays(now, 100), minQuantity: 6, caloriesPerUnit: 250 },
      { name: "Peanut butter", quantity: 6, unit: "jars", category: "Food", location: "Home", expirationDate: addDays(now, 60), minQuantity: 2, caloriesPerUnit: 3100 },
      { name: "Oatmeal packets", quantity: 30, unit: "packets", category: "Food", location: "Home", minQuantity: 10, caloriesPerUnit: 150 },
      { name: "Water jugs (5 gal)", quantity: 8, unit: "gallons", category: "Water", location: "Home", minQuantity: 4, targetQuantity: 20 },
      { name: "Water bottles", quantity: 24, unit: "bottles", category: "Water", location: "Vehicle", minQuantity: 12 },
      { name: "Water purification tablets", quantity: 100, unit: "tablets", category: "Water", location: "Bug-out Bag", minQuantity: 50 },
      { name: "5.56 NATO", quantity: 420, unit: "rounds", category: "Ammo", location: "Home", minQuantity: 200, targetQuantity: 500 },
      { name: "9mm", quantity: 180, unit: "rounds", category: "Ammo", location: "Vehicle", minQuantity: 50 },
      { name: ".22 LR", quantity: 500, unit: "rounds", category: "Ammo", location: "Home", minQuantity: 200 },
      { name: "12 gauge shells", quantity: 75, unit: "rounds", category: "Ammo", location: "Garage", minQuantity: 25 },
      { name: "First aid kit", quantity: 1, unit: "kit", category: "Medical", location: "Bug-out Bag" },
      { name: "IFAK", quantity: 1, unit: "kit", category: "Medical", location: "Vehicle" },
      { name: "Bandages (assorted)", quantity: 8, unit: "boxes", category: "Medical", location: "Home", minQuantity: 2 },
      { name: "Pain reliever", quantity: 3, unit: "bottles", category: "Medical", location: "Home", minQuantity: 1 },
      { name: "Gauze rolls", quantity: 12, unit: "rolls", category: "Medical", location: "Home", minQuantity: 4 },
      { name: "Water filter", quantity: 1, unit: "unit", category: "Tools", location: "Bug-out Bag", maintenanceInterval: 90, lastMaintenanceDate: subDays(now, 30) },
      { name: "Multi-tool", quantity: 1, unit: "unit", category: "Tools", location: "Vehicle" },
      { name: "Flashlight", quantity: 2, unit: "units", category: "Tools", location: "Home", maintenanceInterval: 180, lastMaintenanceDate: subDays(now, 60) },
      { name: "Paracord (50 ft)", quantity: 3, unit: "rolls", category: "Tools", location: "Bug-out Bag" },
      { name: "Sleeping bag", quantity: 1, unit: "unit", category: "Shelter", location: "Cabin" },
      { name: "Tent (2-person)", quantity: 1, unit: "unit", category: "Shelter", location: "Garage" },
      { name: "Tarps", quantity: 3, unit: "units", category: "Shelter", location: "Cabin", minQuantity: 1 },
      { name: "Emergency blanket", quantity: 5, unit: "sheets", category: "Shelter", location: "Bug-out Bag" },
      { name: "Gas cans (stored)", quantity: 10, unit: "gallons", category: "Fuel & Energy", location: "Garage", minQuantity: 5 },
      { name: "AA batteries", quantity: 36, unit: "count", category: "Fuel & Energy", location: "Home", minQuantity: 12 },
      { name: "Propane tanks", quantity: 4, unit: "tanks", category: "Fuel & Energy", location: "Garage", minQuantity: 2 },
      { name: "Hand-crank radio", quantity: 1, unit: "unit", category: "Communication", location: "Bug-out Bag" },
      { name: "Soap (bar)", quantity: 6, unit: "bars", category: "Hygiene", location: "Home", minQuantity: 2 },
      { name: "Toothpaste", quantity: 4, unit: "tubes", category: "Hygiene", location: "Home", minQuantity: 1 },
      { name: "Tactical flashlight", quantity: 1, unit: "unit", category: "Defense", location: "Vehicle" },
    ];

    const createdItemIds: string[] = [];
    for (const def of itemDefs) {
      const categoryId = categoryIds[def.category];
      const locationId = locationIds[def.location];
      if (!categoryId || !locationId) continue;
      const item = await prisma.item.create({
        data: {
          userId,
          name: def.name,
          description: def.description ?? null,
          quantity: def.quantity,
          unit: def.unit,
          categoryId,
          locationId,
          expirationDate: def.expirationDate ?? null,
          maintenanceInterval: def.maintenanceInterval ?? null,
          lastMaintenanceDate: def.lastMaintenanceDate ?? null,
          rotationSchedule: def.rotationSchedule ?? null,
          lastRotationDate: def.lastRotationDate ?? null,
          minQuantity: def.minQuantity ?? 0,
          targetQuantity: def.targetQuantity ?? 0,
          caloriesPerUnit: def.caloriesPerUnit ?? null,
        },
      });
      await syncItemEvents(prisma, userId, item);
      createdItemIds.push(item.id);
      await recordTestData(prisma, userId, item.id, "item");
    }

    // Record events created by syncItemEvents for our test items
    const testEvents = await prisma.event.findMany({
      where: { userId, itemId: { in: createdItemIds } },
      select: { id: true },
    });
    for (const ev of testEvents) {
      await recordTestData(prisma, userId, ev.id, "event");
    }

    // Household: add sample family members if user has none (so Days of Food uses household)
    const existingHousehold = await prisma.familyMember.count({ where: { userId } });
    let familyMembersCreated = 0;
    if (existingHousehold === 0) {
      const familyDefs = [
        { name: "Adult 1", age: 35, weightKg: 80, heightCm: 175, sex: "male" as const },
        { name: "Adult 2", age: 33, weightKg: 65, heightCm: 165, sex: "female" as const },
        { name: "Child 1", age: 10, weightKg: 35, heightCm: 140, sex: "male" as const },
        { name: "Child 2", age: 8, weightKg: 28, heightCm: 130, sex: "female" as const },
      ];
      for (const f of familyDefs) {
        const member = await prisma.familyMember.create({
          data: { userId, name: f.name, age: f.age, weightKg: f.weightKg, heightCm: f.heightCm, sex: f.sex },
        });
        await recordTestData(prisma, userId, member.id, "family_member");
        familyMembersCreated++;
      }
    }

    // Consumption logs spread over the last ~6 months (by item name)
    const itemsByName = await prisma.item.findMany({
      where: { userId, id: { in: createdItemIds } },
      select: { id: true, name: true, quantity: true },
    });
    const byName = new Map(itemsByName.map((i) => [i.name, i]));

    const consumptionEntries: Array<{ itemName: string; quantity: number; note: string; daysAgo: number }> = [
      { itemName: "Canned beans", quantity: 2, note: "Weekly rotation", daysAgo: 14 },
      { itemName: "5.56 NATO", quantity: 20, note: "Range day", daysAgo: 7 },
      { itemName: "9mm", quantity: 15, note: "Practice", daysAgo: 45 },
      { itemName: "Water jugs (5 gal)", quantity: 1, note: "Water rotation", daysAgo: 30 },
      { itemName: "Water bottles", quantity: 6, note: "Trip", daysAgo: 21 },
      { itemName: "MREs", quantity: 2, note: "Test", daysAgo: 90 },
      { itemName: "Bandages (assorted)", quantity: 1, note: "First aid use", daysAgo: 60 },
      { itemName: "AA batteries", quantity: 8, note: "Devices", daysAgo: 25 },
      { itemName: "Rice (long grain)", quantity: 2, note: "Cooking", daysAgo: 10 },
      { itemName: "Oatmeal packets", quantity: 5, note: "Breakfast", daysAgo: 5 },
      { itemName: "Canned soup", quantity: 3, note: "Lunch", daysAgo: 3 },
      { itemName: ".22 LR", quantity: 50, note: "Plinking", daysAgo: 120 },
    ];

    let consumptionCount = 0;
    for (const e of consumptionEntries) {
      const item = byName.get(e.itemName);
      if (!item || item.quantity < e.quantity) continue;
      const createdAt = subDays(now, e.daysAgo);
      createdAt.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);
      const log = await prisma.consumptionLog.create({
        data: {
          userId,
          itemId: item.id,
          quantity: e.quantity,
          note: e.note,
          createdAt,
        },
      });
      await recordTestData(prisma, userId, log.id, "consumption_log");
      await prisma.item.update({
        where: { id: item.id },
        data: { quantity: item.quantity - e.quantity },
      });
      consumptionCount++;
    }

    // Set user activity level if not set (so Days of Food and food goal use household + activity)
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: { activityLevel: true },
    });
    const activityLevelSet = userBefore?.activityLevel == null;
    if (activityLevelSet) {
      await prisma.user.update({
        where: { id: userId },
        data: { activityLevel: "moderate" },
      });
    }

    // Set inventory goals so dashboard Category Progress and Goals feature are demonstrated
    await prisma.user.update({
      where: { id: userId },
      data: {
        ammoGoalRounds: 1500,
        waterGoalGallons: 30,
        foodGoalDays: 90,
        fuelGoalGallons: 20,
      },
    });

    return {
      categories: categoryNames.length,
      locations: locationNames.length,
      items: itemDefs.length,
      consumptionLogs: consumptionCount,
      familyMembers: familyMembersCreated,
      activityLevelSet,
      goalsSet: true,
    };
  }),

  /** Remove only data that was created by "Fill test data". Leaves all user-created data untouched. */
  removeTestData: protectedProcedure.mutation(async ({ ctx }) => {
    const prisma = ctx.prisma;
    const userId = ctx.userId;

    const records = await prisma.testDataRecord.findMany({
      where: { userId },
      orderBy: { kind: "asc" },
    });
    if (records.length === 0) {
      return { removed: 0, message: "No test data found to remove." };
    }

    const byKind = {
      consumption_log: [] as string[],
      event: [] as string[],
      item: [] as string[],
      category: [] as string[],
      location: [] as string[],
      family_member: [] as string[],
    };
    for (const r of records) {
      const list = byKind[r.kind as keyof typeof byKind];
      if (list) list.push(r.recordId);
    }

    let removed = 0;
    // Delete in FK-safe order: consumption logs, events, items, then categories, locations, family members
    if (byKind.consumption_log.length > 0) {
      await prisma.consumptionLog.deleteMany({
        where: { userId, id: { in: byKind.consumption_log } },
      });
      removed += byKind.consumption_log.length;
    }
    if (byKind.event.length > 0) {
      await prisma.event.deleteMany({
        where: { userId, id: { in: byKind.event } },
      });
      removed += byKind.event.length;
    }
    if (byKind.item.length > 0) {
      await prisma.item.deleteMany({
        where: { userId, id: { in: byKind.item } },
      });
      removed += byKind.item.length;
    }
    if (byKind.category.length > 0) {
      await prisma.category.deleteMany({
        where: { userId, id: { in: byKind.category } },
      });
      removed += byKind.category.length;
    }
    if (byKind.location.length > 0) {
      await prisma.location.deleteMany({
        where: { userId, id: { in: byKind.location } },
      });
      removed += byKind.location.length;
    }
    if (byKind.family_member.length > 0) {
      await prisma.familyMember.deleteMany({
        where: { userId, id: { in: byKind.family_member } },
      });
      removed += byKind.family_member.length;
    }

    await prisma.testDataRecord.deleteMany({ where: { userId } });

    return {
      removed,
      message: `Removed ${removed} test data record(s). Your real data was not modified.`,
    };
  }),

  /** Count test data records so the UI can show "Remove test data" only when there is something to remove. */
  hasTestData: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.testDataRecord.count({
      where: { userId: ctx.userId },
    });
    return { hasTestData: count > 0, count };
  }),
});
