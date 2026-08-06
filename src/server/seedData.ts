import type { PrismaClient } from "~/generated/prisma/client";
import { syncItemEvents } from "~/server/syncItemEvents";
import { shouldSeed } from "~/server/appMode";

/**
 * Sample-data seeder shared by two entry points:
 *   1. Settings -> "Fill test data" button (`settings.fillTestData` mutation).
 *   2. Automatic startup seeding when `PREPTRAC_MODE` is `demo` or `seeded`
 *      (see {@link ensureSeededOnce}).
 *
 * The dataset intentionally exercises every feature of the app: all category
 * kinds (food, water, ammo, fuel, other), items with expiration / maintenance /
 * rotation schedules, consumption AND addition history, a household (so "Days of
 * Food" and water-in-days work), an activity level, and inventory goals.
 *
 * Everything created is tracked via {@link recordTestData} as a `TestDataRecord`
 * row, which does double duty: it powers "Remove test data" AND acts as the
 * idempotency marker so automatic seeding runs at most once per database.
 */

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function subDays(d: Date, days: number) {
  return addDays(d, -days);
}

type TestDataKind =
  | "category"
  | "location"
  | "item"
  | "consumption_log"
  | "event"
  | "family_member";

async function recordTestData(
  prisma: PrismaClient,
  userId: string,
  recordId: string,
  kind: TestDataKind,
) {
  await prisma.testDataRecord.create({
    data: { userId, recordId, kind },
  });
}

/** Result shape returned by both the seeder and the "Fill test data" UI. */
export interface SeedResult {
  categories: number;
  locations: number;
  items: number;
  consumptionLogs: number;
  additionLogs: number;
  familyMembers: number;
  activityLevelSet: boolean;
  goalsSet: boolean;
}

/**
 * Seed (or top up) the sample dataset for a user. Safe to call multiple times:
 * categories and locations are get-or-create by name; items are always created
 * fresh, so callers that must avoid duplicates should gate on the
 * `TestDataRecord` marker via {@link ensureSeededOnce}.
 */
export async function seedDemoData(
  prisma: PrismaClient,
  userId: string,
): Promise<SeedResult> {
  const now = new Date();

  // Ensure categories exist (get or create)
  const categoryNames = [
    { name: "Food", description: "Canned goods, MREs, dried food", color: "#F59E0B", kind: "food" },
    { name: "Water", description: "Water storage and purification", color: "#3B82F6", kind: "water" },
    { name: "Ammo", description: "Ammunition and reloading", color: "#EF4444", kind: "ammo" },
    { name: "Medical", description: "First aid and medications", color: "#10B981", kind: "other" },
    { name: "Tools", description: "Knives, multi-tools, equipment", color: "#6B7280", kind: "other" },
    { name: "Shelter", description: "Tents, tarps, sleeping gear", color: "#EC4899", kind: "other" },
    { name: "Fuel & Energy", description: "Gas, batteries, solar", color: "#F97316", kind: "fuel" },
    { name: "Communication", description: "Radios, signaling", color: "#06B6D4", kind: "other" },
    { name: "Hygiene", description: "Soap, toiletries", color: "#8B5CF6", kind: "other" },
    { name: "Defense", description: "Self-defense and security", color: "#DC2626", kind: "other" },
  ];
  const categoryIds: Record<string, string> = {};
  for (const cat of categoryNames) {
    let c = await prisma.category.findFirst({
      where: { userId, name: cat.name },
    });
    if (!c) {
      c = await prisma.category.create({
        data: { userId, name: cat.name, description: cat.description, color: cat.color, kind: cat.kind },
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
    { name: "Canned beans", quantity: 24, unit: "cans", category: "Food", location: "Home", expirationDate: addDays(now, 120), minQuantity: 6, caloriesPerUnit: 200 },
    { name: "Rice (long grain)", quantity: 20, unit: "lbs", category: "Food", location: "Home", expirationDate: addDays(now, 150), minQuantity: 5, caloriesPerUnit: 1700 },
    { name: "MREs", quantity: 12, unit: "meals", category: "Food", location: "Bug-out Bag", expirationDate: addDays(now, 90), minQuantity: 4, caloriesPerUnit: 1200 },
    { name: "Canned soup", quantity: 18, unit: "cans", category: "Food", location: "Home", expirationDate: addDays(now, 100), minQuantity: 6, caloriesPerUnit: 250 },
    { name: "Peanut butter", quantity: 6, unit: "jars", category: "Food", location: "Home", expirationDate: addDays(now, 60), minQuantity: 2, caloriesPerUnit: 3100 },
    { name: "Oatmeal packets", quantity: 30, unit: "packets", category: "Food", location: "Home", minQuantity: 10, caloriesPerUnit: 150 },
    { name: "Water jugs (5 gal)", quantity: 8, unit: "gallons", category: "Water", location: "Home", minQuantity: 4, rotationSchedule: 90, lastRotationDate: subDays(now, 45) },
    { name: "Water bottles", quantity: 24, unit: "bottles", category: "Water", location: "Vehicle", minQuantity: 12 },
    { name: "Water purification tablets", quantity: 100, unit: "tablets", category: "Water", location: "Bug-out Bag", minQuantity: 50 },
    { name: "5.56 NATO", quantity: 420, unit: "rounds", category: "Ammo", location: "Home", minQuantity: 200 },
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
    { name: "Portable power station", quantity: 2.5, unit: "kWh", category: "Fuel & Energy", location: "Home", minQuantity: 0 },
    { name: "Power bank (large)", quantity: 1, unit: "kWh", category: "Fuel & Energy", location: "Bug-out Bag", minQuantity: 0 },
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

  // Household: add sample family members if user has none (2 parents, 2 kids — so Days of Food/Water use household)
  const existingHousehold = await prisma.familyMember.count({ where: { userId } });
  let familyMembersCreated = 0;
  if (existingHousehold === 0) {
    const familyDefs = [
      { name: "Dad", age: 35, weightKg: 82, heightCm: 178, sex: "male" as const },
      { name: "Mom", age: 32, weightKg: 65, heightCm: 165, sex: "female" as const },
      { name: "Alex", age: 10, weightKg: 35, heightCm: 140, sex: "male" as const },
      { name: "Sam", age: 7, weightKg: 25, heightCm: 122, sex: "female" as const },
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
        type: "consumption",
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

  // Addition logs (e.g. refuel, restock) — demonstrates Activity "Add" feature
  const additionEntries: Array<{ itemName: string; quantity: number; note: string; daysAgo: number }> = [
    { itemName: "Gas cans (stored)", quantity: 5, note: "Filled cans at station", daysAgo: 3 },
    { itemName: "Gas cans (stored)", quantity: 5, note: "Refuel", daysAgo: 45 },
    { itemName: "Water jugs (5 gal)", quantity: 2, note: "Refilled jugs", daysAgo: 12 },
    { itemName: "Water bottles", quantity: 12, note: "Bulk buy", daysAgo: 18 },
    { itemName: "5.56 NATO", quantity: 20, note: "Restock after range", daysAgo: 10 },
    { itemName: "9mm", quantity: 50, note: "Ammo run", daysAgo: 50 },
    { itemName: "AA batteries", quantity: 12, note: "Stock up", daysAgo: 22 },
    { itemName: "Canned beans", quantity: 6, note: "Restock pantry", daysAgo: 8 },
    { itemName: "Rice (long grain)", quantity: 5, note: "Bulk restock", daysAgo: 35 },
    { itemName: "Bandages (assorted)", quantity: 2, note: "First aid restock", daysAgo: 65 },
  ];

  let additionCount = 0;
  const itemsByNameAfterConsumption = await prisma.item.findMany({
    where: { userId, id: { in: createdItemIds } },
    select: { id: true, name: true, quantity: true },
  });
  const byNameAfter = new Map(itemsByNameAfterConsumption.map((i) => [i.name, i]));
  for (const e of additionEntries) {
    const item = byNameAfter.get(e.itemName);
    if (!item) continue;
    const createdAt = subDays(now, e.daysAgo);
    createdAt.setHours(12 + Math.floor(Math.random() * 6), 0, 0, 0);
    const log = await prisma.consumptionLog.create({
      data: {
        userId,
        itemId: item.id,
        quantity: e.quantity,
        type: "addition",
        note: e.note,
        createdAt,
      },
    });
    await recordTestData(prisma, userId, log.id, "consumption_log");
    await prisma.item.update({
      where: { id: item.id },
      data: { quantity: item.quantity + e.quantity },
    });
    additionCount++;
    byNameAfter.set(e.itemName, { ...item, quantity: item.quantity + e.quantity });
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
      fuelGoalKwh: 100,
      fuelGoalBatteryKwh: 50,
    },
  });

  return {
    categories: categoryNames.length,
    locations: locationNames.length,
    items: itemDefs.length,
    consumptionLogs: consumptionCount,
    additionLogs: additionCount,
    familyMembers: familyMembersCreated,
    activityLevelSet,
    goalsSet: true,
  };
}

/**
 * Process-level guard so the "is this database already seeded?" check (and the
 * seeding itself) runs at most once per Node process. Seeding is driven by
 * `PREPTRAC_MODE` (demo / seeded) and uses the `TestDataRecord` marker for
 * idempotency across restarts: once a database has the marker, it is never
 * re-seeded, even after the process restarts.
 *
 * If seeding throws, the guard resets so the next request can retry rather than
 * silently leaving the app unseeded.
 */
let seedCheckedThisProcess = false;

export async function ensureSeededOnce(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  if (seedCheckedThisProcess) return;
  // Claim the guard immediately to avoid overlapping seed runs from concurrent
  // first-requests within the same process.
  seedCheckedThisProcess = true;
  try {
    if (!shouldSeed()) return;
    const existing = await prisma.testDataRecord.count({ where: { userId } });
    if (existing > 0) return; // Marker present: already seeded, leave data untouched.
    await seedDemoData(prisma, userId);
  } catch (err) {
    // Allow a later request to retry; surface the error to the caller (context
    // creation) so it is logged rather than swallowed.
    seedCheckedThisProcess = false;
    throw err;
  }
}
