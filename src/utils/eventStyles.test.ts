import { describe, it, expect } from "vitest";
import {
  getEventBadgeClass,
  getEventSwatchClass,
  getEventLabel,
  EVENT_BADGE_CLASSES,
  EVENT_SWATCH_CLASSES,
} from "~/utils/eventStyles";

describe("event styles", () => {
  it("maps every event type to a distinct badge class", () => {
    for (const [type, cls] of Object.entries(EVENT_BADGE_CLASSES)) {
      expect(getEventBadgeClass(type)).toBe(cls);
    }
    // sanity: the four canonical types are all covered
    expect(Object.keys(EVENT_BADGE_CLASSES)).toEqual([
      "expiration",
      "maintenance",
      "rotation",
      "battery_replacement",
    ]);
  });

  it("maps every event type to a swatch class", () => {
    for (const [type, cls] of Object.entries(EVENT_SWATCH_CLASSES)) {
      expect(getEventSwatchClass(type)).toBe(cls);
    }
  });

  it("falls back to a gray badge for unknown types", () => {
    expect(getEventBadgeClass("unknown")).toContain("bg-gray-100");
  });

  it("falls back to a gray swatch for unknown types", () => {
    expect(getEventSwatchClass("unknown")).toContain("bg-gray-100");
  });

  it("humanizes the label", () => {
    expect(getEventLabel("battery_replacement")).toBe("battery replacement");
    expect(getEventLabel("expiration")).toBe("expiration");
  });
});
