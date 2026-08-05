import { describe, it, expect } from "vitest";
import { formatCSVDate, toDateInputValue } from "./dates";

describe("formatCSVDate", () => {
  it("formats a UTC instant as M/d/yyyy from UTC parts", () => {
    expect(formatCSVDate(new Date("2026-01-15T00:00:00.000Z"))).toBe("1/15/2026");
    expect(formatCSVDate(new Date("2026-12-31T00:00:00.000Z"))).toBe("12/31/2026");
  });

  it("is stable for a non-midnight UTC time (no day roll from timezone)", () => {
    // Late-evening UTC must still map to the same UTC calendar day.
    expect(formatCSVDate(new Date("2026-01-15T23:59:59.000Z"))).toBe("1/15/2026");
  });

  it("accepts ISO string input", () => {
    expect(formatCSVDate("2026-03-07T05:30:00.000Z")).toBe("3/7/2026");
  });

  it("returns empty string for null/empty/invalid input", () => {
    expect(formatCSVDate(null)).toBe("");
    expect(formatCSVDate(undefined)).toBe("");
    expect(formatCSVDate("")).toBe("");
    expect(formatCSVDate("not-a-date")).toBe("");
  });
});

describe("toDateInputValue", () => {
  it("formats a UTC instant as yyyy-MM-dd from UTC parts", () => {
    expect(toDateInputValue(new Date("2026-01-15T00:00:00.000Z"))).toBe("2026-01-15");
    expect(toDateInputValue(new Date("2026-12-31T00:00:00.000Z"))).toBe("2026-12-31");
    expect(toDateInputValue(new Date("2026-03-07T23:59:59.000Z"))).toBe("2026-03-07");
  });

  it("round-trips with new Date(value).toISOString()", () => {
    const original = "2026-01-15T00:00:00.000Z";
    const input = toDateInputValue(new Date(original));
    // A date-only string parses as UTC midnight, matching the stored instant.
    expect(new Date(input).toISOString()).toBe(original);
  });

  it("returns empty string for null/empty/invalid input", () => {
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue(undefined)).toBe("");
    expect(toDateInputValue("")).toBe("");
    expect(toDateInputValue("not-a-date")).toBe("");
  });
});
