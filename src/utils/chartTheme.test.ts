import { describe, it, expect } from "vitest";
import { chartTheme } from "./chartTheme";

describe("chartTheme", () => {
  it("returns dark tokens when isDark is true", () => {
    const t = chartTheme(true);
    expect(t.axis).toBe("#bcc6af");
    expect(t.grid).toBe("#4b5842");
    expect(t.legend).toBe("#f1f0e3");
    expect(t.pieLabel).toBe("#f1f0e3");
    expect(t.tooltipStyle.backgroundColor).toBe("#343f2f");
    expect(t.tooltipItemStyle.color).toBe("#f1f0e3");
  });

  it("returns light tokens when isDark is false", () => {
    const t = chartTheme(false);
    expect(t.axis).toBe("#596151");
    expect(t.grid).toBe("#c1c6b5");
    expect(t.legend).toBe("#293126");
    expect(t.tooltipStyle.backgroundColor).toBe("#faf9f2");
    expect(t.tooltipItemStyle.color).toBe("#293126");
  });

  it("dark tooltip uses a light text color so it is legible on the dark background", () => {
    const dark = chartTheme(true);
    const light = chartTheme(false);
    // Dark tooltip text must not equal the dark background color.
    expect(dark.tooltipStyle.color).not.toBe(dark.tooltipStyle.backgroundColor);
    // Light theme should use a dark tooltip background (white) with dark text.
    expect(light.tooltipStyle.backgroundColor).toBe("#faf9f2");
    expect(light.tooltipStyle.color).toBe("#293126");
  });

  it("always returns a rounded tooltip border + radius", () => {
    for (const isDark of [true, false]) {
      const t = chartTheme(isDark);
      expect(t.tooltipStyle.borderRadius).toBe("3px");
      expect(t.tooltipStyle.border).toContain("1px solid");
    }
  });
});
