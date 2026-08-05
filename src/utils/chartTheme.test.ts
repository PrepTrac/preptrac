import { describe, it, expect } from "vitest";
import { chartTheme } from "./chartTheme";

describe("chartTheme", () => {
  it("returns dark tokens when isDark is true", () => {
    const t = chartTheme(true);
    expect(t.axis).toBe("#9ca3af");
    expect(t.grid).toBe("#374151");
    expect(t.legend).toBe("#e5e7eb");
    expect(t.pieLabel).toBe("#e5e7eb");
    expect(t.tooltipStyle.backgroundColor).toBe("#1f2937");
    expect(t.tooltipItemStyle.color).toBe("#f3f4f6");
  });

  it("returns light tokens when isDark is false", () => {
    const t = chartTheme(false);
    expect(t.axis).toBe("#4b5563");
    expect(t.grid).toBe("#e5e7eb");
    expect(t.legend).toBe("#374151");
    expect(t.tooltipStyle.backgroundColor).toBe("#ffffff");
    expect(t.tooltipItemStyle.color).toBe("#111827");
  });

  it("dark tooltip uses a light text color so it is legible on the dark background", () => {
    const dark = chartTheme(true);
    const light = chartTheme(false);
    // Dark tooltip text must not equal the dark background color.
    expect(dark.tooltipStyle.color).not.toBe(dark.tooltipStyle.backgroundColor);
    // Light theme should use a dark tooltip background (white) with dark text.
    expect(light.tooltipStyle.backgroundColor).toBe("#ffffff");
    expect(light.tooltipStyle.color).toBe("#111827");
  });

  it("always returns a rounded tooltip border + radius", () => {
    for (const isDark of [true, false]) {
      const t = chartTheme(isDark);
      expect(t.tooltipStyle.borderRadius).toBe("0.5rem");
      expect(t.tooltipStyle.border).toContain("1px solid");
    }
  });
});
