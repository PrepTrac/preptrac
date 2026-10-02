import { describe, expect, it } from "vitest";
import { deriveAttention } from "./attention";

const now = new Date("2026-10-02T12:00:00Z");
const item = { id: "water", name: "Water", quantity: 2, minQuantity: 3, unit: "gallons", location: { name: "Pantry" } };

describe("dashboard attention checks", () => {
  it("merges item/type duplicates and keeps different checks on the same item", () => {
    const rows = deriveAttention({
      upcomingExpirations: [{ ...item, expirationDate: "2026-10-10T12:00:00Z" }],
      needsMaintenance: [{ ...item, nextMaintenanceDate: "2026-10-01T12:00:00Z" }],
      lowItems: [item],
      upcomingEvents: [
        { id: "exp", type: "expiration", title: "Expire water", itemId: item.id, item, date: "2026-10-10T12:00:00Z" },
        { id: "maint", type: "maintenance", title: "Service water", itemId: item.id, item, date: "2026-10-01T12:00:00Z" },
      ],
    }, now);
    expect(rows.map(r => r.type)).toEqual(["maintenance", "expiration", "low_inventory"]);
    expect(rows[1]).toMatchObject({ name: "Water", location: "Pantry" });
  });
  it("sorts overdue maintenance first, future dates next, undated low stock last", () => {
    const rows = deriveAttention({
      needsMaintenance: [{ ...item, nextMaintenanceDate: "2026-10-01T12:00:00Z" }],
      lowItems: [item],
      upcomingEvents: [
        { id: "later", type: "rotation", title: "Rotate supplies", date: "2026-10-20T12:00:00Z" },
        { id: "earlier", type: "battery_replacement", title: "Replace battery", date: "2026-10-05T12:00:00Z" },
      ],
    }, now);
    expect(rows.map(r => r.name)).toEqual(["Water", "Replace battery", "Rotate supplies", "Water"]);
  });
  it("uses the 30-day expiration window for both events and item checks", () => {
    const rows = deriveAttention({
      upcomingExpirations: [
        { ...item, id: "past", expirationDate: "2026-10-01T12:00:00Z" },
        { ...item, id: "edge", expirationDate: "2026-11-01T12:00:00Z" },
        { ...item, id: "outside", expirationDate: "2026-11-02T12:00:00Z" },
      ],
      upcomingEvents: [{ id: "outside-event", type: "expiration", title: "Later", date: "2026-11-02T12:00:00Z" }],
    }, now);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("edge:expiration");
  });
  it("requires a positive explicit low threshold and rejects completed/invalid events", () => {
    expect(deriveAttention({
      lowItems: [{ ...item, minQuantity: 0 }, { ...item, quantity: 4 }],
      upcomingEvents: [
        { id: "done", type: "rotation", title: "Done", date: now, completed: true },
        { id: "bad", type: "rotation", title: "Invalid", date: "invalid" },
      ],
    }, now)).toEqual([]);
  });
  it("retains standalone events and different items sharing a name", () => {
    const rows = deriveAttention({ lowItems: [item, { ...item, id: "other" }], upcomingEvents: [
      { id: "one", type: "rotation", title: "Practice", date: now },
      { id: "two", type: "rotation", title: "Practice", date: now },
    ] }, now);
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map(r => r.id)).size).toBe(4);
  });
});
