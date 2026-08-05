import { describe, expect, it } from "vitest";
import {
  computeExpirationAlerts,
  computeMaintenanceAlerts,
  computeRotationAlerts,
  computeLowInventoryAlerts,
  collectDueAlerts,
  dedupKey,
  dayKey,
  type AlertableItem,
  type LeadTimes,
} from "~/server/notifications";

const NOW = new Date("2026-01-10T00:00:00.000Z");

function baseItem(overrides: Partial<AlertableItem> = {}): AlertableItem {
  return {
    id: "item-1",
    name: "Test Item",
    quantity: 5,
    unit: "cans",
    minQuantity: 0,
    expirationDate: null,
    maintenanceInterval: null,
    lastMaintenanceDate: null,
    rotationSchedule: null,
    lastRotationDate: null,
    ...overrides,
  };
}

describe("computeExpirationAlerts", () => {
  it("alerts when expiration is within the lead window", () => {
    const item = baseItem({ expirationDate: new Date("2026-01-15T00:00:00.000Z") });
    const alerts = computeExpirationAlerts([item], 7, NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.type).toBe("expiration");
    expect(alerts[0]!.itemId).toBe("item-1");
  });

  it("does not alert when expiration is beyond the lead window", () => {
    const item = baseItem({ expirationDate: new Date("2026-03-01T00:00:00.000Z") });
    expect(computeExpirationAlerts([item], 7, NOW)).toHaveLength(0);
  });

  it("does not alert for already-expired items", () => {
    const item = baseItem({ expirationDate: new Date("2025-12-01T00:00:00.000Z") });
    expect(computeExpirationAlerts([item], 7, NOW)).toHaveLength(0);
  });

  it("includes the boundary (exactly leadDays away)", () => {
    const item = baseItem({ expirationDate: new Date("2026-01-17T00:00:00.000Z") });
    expect(computeExpirationAlerts([item], 7, NOW)).toHaveLength(1);
  });

  it("returns nothing when leadDays is null", () => {
    const item = baseItem({ expirationDate: new Date("2026-01-15T00:00:00.000Z") });
    expect(computeExpirationAlerts([item], null, NOW)).toHaveLength(0);
  });
});

describe("computeMaintenanceAlerts", () => {
  it("alerts when next maintenance falls within the lead window", () => {
    // last maintenance 2025-12-20, interval 30d => next 2026-01-19; lead 3d => notify from 01-16
    const item = baseItem({
      lastMaintenanceDate: new Date("2025-12-20T00:00:00.000Z"),
      maintenanceInterval: 30,
    });
    // NOW is 2026-01-10 which is before the 01-16 notify-from => no alert
    expect(computeMaintenanceAlerts([item], 3, NOW)).toHaveLength(0);

    // Move now into the window
    const inWindow = new Date("2026-01-16T00:00:00.000Z");
    expect(computeMaintenanceAlerts([item], 3, inWindow)).toHaveLength(1);
  });

  it("does not alert after the maintenance date has passed", () => {
    const item = baseItem({
      lastMaintenanceDate: new Date("2025-12-01T00:00:00.000Z"),
      maintenanceInterval: 10, // next 2025-12-11, already past
    });
    expect(computeMaintenanceAlerts([item], 3, NOW)).toHaveLength(0);
  });

  it("skips items missing interval or last date", () => {
    expect(
      computeMaintenanceAlerts([baseItem({ maintenanceInterval: 30 })], 3, NOW),
    ).toHaveLength(0);
  });
});

describe("computeRotationAlerts", () => {
  it("alerts when next rotation falls within the lead window", () => {
    // last rotation 2026-01-08, schedule 7d => next 2026-01-15; lead 7d => notify from 01-08
    const item = baseItem({
      lastRotationDate: new Date("2026-01-08T00:00:00.000Z"),
      rotationSchedule: 7,
    });
    expect(computeRotationAlerts([item], 7, NOW)).toHaveLength(1);
  });

  it("skips items without rotation data", () => {
    expect(computeRotationAlerts([baseItem({ rotationSchedule: 7 })], 7, NOW)).toHaveLength(0);
  });
});

describe("computeLowInventoryAlerts", () => {
  it("alerts when quantity is at or below the threshold", () => {
    const item = baseItem({ quantity: 2, minQuantity: 5 });
    expect(computeLowInventoryAlerts([item], true, NOW)).toHaveLength(1);
  });

  it("does not alert when above the threshold", () => {
    const item = baseItem({ quantity: 10, minQuantity: 5 });
    expect(computeLowInventoryAlerts([item], true, NOW)).toHaveLength(0);
  });

  it("does not alert for items without a threshold", () => {
    const item = baseItem({ quantity: 0, minQuantity: 0 });
    expect(computeLowInventoryAlerts([item], true, NOW)).toHaveLength(0);
  });

  it("returns nothing when disabled", () => {
    const item = baseItem({ quantity: 1, minQuantity: 5 });
    expect(computeLowInventoryAlerts([item], false, NOW)).toHaveLength(0);
  });
});

describe("collectDueAlerts", () => {
  it("combines all alert types", () => {
    const lead: LeadTimes = {
      expirationDays: 30,
      maintenanceDays: 10,
      rotationDays: 10,
      lowInventory: true,
    };
    const items: AlertableItem[] = [
      baseItem({ id: "a", expirationDate: new Date("2026-01-20T00:00:00.000Z") }),
      baseItem({
        id: "b",
        quantity: 1,
        minQuantity: 3,
      }),
    ];
    const alerts = collectDueAlerts(items, lead, NOW);
    expect(alerts.map((a) => a.type).sort()).toEqual(["expiration", "low_inventory"]);
  });

  it("respects per-type null lead times", () => {
    const lead: LeadTimes = {
      expirationDays: null,
      maintenanceDays: null,
      rotationDays: null,
      lowInventory: false,
    };
    const items = [
      baseItem({ id: "a", expirationDate: new Date("2026-01-11T00:00:00.000Z") }),
    ];
    expect(collectDueAlerts(items, lead, NOW)).toHaveLength(0);
  });
});

describe("dedupKey", () => {
  it("is unique per channel and event date", () => {
    const alert = {
      type: "expiration" as const,
      message: "x",
      date: new Date("2026-01-15T00:00:00.000Z"),
      itemId: "i1",
    };
    const email = dedupKey("u1", "email", alert);
    const webhook = dedupKey("u1", "webhook", alert);
    expect(email).not.toBe(webhook);
    expect(email).toContain("u1:email:expiration:i1:2026-01-15");
  });

  it("uses UTC day so it is timezone independent", () => {
    const alert = {
      type: "low_inventory" as const,
      message: "x",
      date: new Date("2026-01-10T23:30:00.000Z"),
      itemId: "i1",
    };
    expect(dedupKey("u1", "email", alert)).toContain("2026-01-10");
  });
});

describe("dayKey", () => {
  it("slices to UTC yyyy-MM-dd", () => {
    expect(dayKey(new Date("2026-01-10T23:59:00.000Z"))).toBe("2026-01-10");
    expect(dayKey(new Date("2026-01-11T00:01:00.000Z"))).toBe("2026-01-11");
  });
});
