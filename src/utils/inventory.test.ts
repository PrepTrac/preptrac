import { describe, it, expect } from "vitest";
import { isLowInventory } from "./inventory";

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
