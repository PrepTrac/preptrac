import { describe, it, expect } from "vitest";
import { buildEventsToCreate } from "./syncItemEvents";

describe("buildEventsToCreate", () => {
  const baseItem = {
    name: "Test Item",
    expirationDate: null as Date | null,
    maintenanceInterval: null as number | null,
    lastMaintenanceDate: null as Date | null,
    rotationSchedule: null as number | null,
    lastRotationDate: null as Date | null,
  };

  it("returns empty array when item has no date fields", () => {
    expect(buildEventsToCreate(baseItem)).toEqual([]);
  });

  it("creates expiration event when expirationDate is set", () => {
    const date = new Date("2025-12-31");
    const result = buildEventsToCreate({
      ...baseItem,
      expirationDate: date,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "expiration",
      title: "Test Item expires",
      date,
    });
  });

  it("creates maintenance event when interval and last date are set", () => {
    const last = new Date("2025-01-01");
    const result = buildEventsToCreate({
      ...baseItem,
      maintenanceInterval: 90,
      lastMaintenanceDate: last,
    });
    expect(result).toHaveLength(1);
    const event = result[0];
    expect(event).toBeDefined();
    expect(event?.type).toBe("maintenance");
    expect(event?.title).toBe("Test Item maintenance");
    const expectedDate = new Date(last);
    expectedDate.setDate(expectedDate.getDate() + 90);
    expect(event?.date).toEqual(expectedDate);
  });

  it("creates rotation event when schedule and last date are set", () => {
    const last = new Date("2025-01-01");
    const result = buildEventsToCreate({
      ...baseItem,
      rotationSchedule: 30,
      lastRotationDate: last,
    });
    expect(result).toHaveLength(1);
    const event = result[0];
    expect(event).toBeDefined();
    expect(event?.type).toBe("rotation");
    expect(event?.title).toBe("Test Item rotation");
    const expectedDate = new Date(last);
    expectedDate.setDate(expectedDate.getDate() + 30);
    expect(event?.date).toEqual(expectedDate);
  });

  it("creates all three events when all date fields are set", () => {
    const expDate = new Date("2025-06-01");
    const lastMaint = new Date("2025-01-01");
    const lastRot = new Date("2025-02-01");
    const result = buildEventsToCreate({
      ...baseItem,
      name: "Full Item",
      expirationDate: expDate,
      maintenanceInterval: 90,
      lastMaintenanceDate: lastMaint,
      rotationSchedule: 30,
      lastRotationDate: lastRot,
    });
    expect(result).toHaveLength(3);
    const types = result.map((e) => e.type).sort();
    expect(types).toEqual(["expiration", "maintenance", "rotation"]);
    const exp = result.find((e) => e.type === "expiration");
    const maint = result.find((e) => e.type === "maintenance");
    const rot = result.find((e) => e.type === "rotation");
    expect(exp).toBeDefined();
    expect(maint).toBeDefined();
    expect(rot).toBeDefined();
    expect(exp?.title).toBe("Full Item expires");
    expect(maint?.title).toBe("Full Item maintenance");
    expect(rot?.title).toBe("Full Item rotation");
  });

  it("does not create maintenance event without lastMaintenanceDate", () => {
    const result = buildEventsToCreate({
      ...baseItem,
      maintenanceInterval: 90,
    });
    expect(result).toHaveLength(0);
  });

  it("does not create rotation event without lastRotationDate", () => {
    const result = buildEventsToCreate({
      ...baseItem,
      rotationSchedule: 30,
    });
    expect(result).toHaveLength(0);
  });
});
