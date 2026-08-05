import { describe, it, expect } from "vitest";
import {
  isLowInventory,
  resolveCategoryKind,
  inferCategoryKindFromName,
  isExpiringSoon,
  EXPIRING_SOON_DAYS,
} from "./inventory";

describe("isLowInventory", () => {
  it("flags items at or below an explicit threshold", () => {
    expect(isLowInventory({ quantity: 5, minQuantity: 10 })).toBe(true);
    expect(isLowInventory({ quantity: 10, minQuantity: 10 })).toBe(true); // equal counts as low
  });

  it("does not flag items above their threshold", () => {
    expect(isLowInventory({ quantity: 11, minQuantity: 10 })).toBe(false);
  });

  it("never flags items without a threshold (minQuantity <= 0)", () => {
    // This is the unified behavior: the legacy `quantity <= 10` fallback is gone.
    expect(isLowInventory({ quantity: 0, minQuantity: 0 })).toBe(false);
    expect(isLowInventory({ quantity: 3, minQuantity: 0 })).toBe(false);
    expect(isLowInventory({ quantity: 5, minQuantity: -1 })).toBe(false);
  });

  it("matches the SQL filter / webhook predicate (minQuantity > 0 && quantity <= minQuantity)", () => {
    expect(isLowInventory({ quantity: 1, minQuantity: 1 })).toBe(true);
    expect(isLowInventory({ quantity: 0, minQuantity: 1 })).toBe(true);
    expect(isLowInventory({ quantity: 2, minQuantity: 1 })).toBe(false);
  });
});

describe("resolveCategoryKind", () => {
  it("uses the explicit kind when set and valid", () => {
    expect(resolveCategoryKind({ kind: "ammo", name: "Whatever" })).toBe("ammo");
    expect(resolveCategoryKind({ kind: "WATER", name: "Stuff" })).toBe("water");
    expect(resolveCategoryKind({ kind: "fuel", name: "Solar" })).toBe("fuel");
  });

  it("falls back to name inference when kind is null/empty/invalid", () => {
    expect(resolveCategoryKind({ kind: null, name: "Water Storage" })).toBe("water");
    expect(resolveCategoryKind({ kind: undefined, name: "Ammo Box" })).toBe("ammo");
    expect(resolveCategoryKind({ kind: "", name: "Food Pantry" })).toBe("food");
    expect(resolveCategoryKind({ kind: "bogus", name: "Fuel & Energy" })).toBe("fuel");
  });

  it("defaults to other when neither kind nor name matches", () => {
    expect(resolveCategoryKind({ kind: null, name: "Medical" })).toBe("other");
  });
});

describe("inferCategoryKindFromName", () => {
  it("maps the seeded canonical names", () => {
    expect(inferCategoryKindFromName("Food")).toBe("food");
    expect(inferCategoryKindFromName("Water")).toBe("water");
    expect(inferCategoryKindFromName("Ammo")).toBe("ammo");
    expect(inferCategoryKindFromName("Fuel & Energy")).toBe("fuel");
  });

  it("returns other for unmatched names", () => {
    expect(inferCategoryKindFromName("Medical")).toBe("other");
    expect(inferCategoryKindFromName("Tools")).toBe("other");
  });
});

describe("isExpiringSoon / EXPIRING_SOON_DAYS", () => {
  it("exposes the documented 30-day window", () => {
    expect(EXPIRING_SOON_DAYS).toBe(30);
  });

  it("flags items within the window and excludes already-expired ones", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");
    const within = new Date("2026-01-20T00:00:00.000Z");
    const atHorizon = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
    const past = new Date("2025-12-01T00:00:00.000Z");
    const beyond = new Date("2026-12-01T00:00:00.000Z");
    expect(isExpiringSoon({ expirationDate: within }, now)).toBe(true);
    expect(isExpiringSoon({ expirationDate: atHorizon }, now)).toBe(true);
    expect(isExpiringSoon({ expirationDate: past }, now)).toBe(false);
    expect(isExpiringSoon({ expirationDate: beyond }, now)).toBe(false);
  });

  it("handles null and invalid dates", () => {
    expect(isExpiringSoon({ expirationDate: null })).toBe(false);
    expect(isExpiringSoon({ expirationDate: "not-a-date" })).toBe(false);
  });
});
