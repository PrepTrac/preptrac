import { describe, it, expect, afterEach, vi } from "vitest";
import {
  normalizeMode,
  getAppMode,
  isReadOnly,
  shouldSeed,
} from "~/server/appMode";

/**
 * Unit tests for the app-mode resolution logic. `getAppMode` reads
 * `process.env.PREPTRAC_MODE` live (intentionally uncached), so we drive it by
 * mutating the env var and restore it afterwards to avoid leaking state.
 */
describe("normalizeMode", () => {
  it.each([
    ["demo", "demo"],
    ["DEMO", "demo"],
    ["  demo  ", "demo"],
    ["Demo", "demo"],
    ["seeded", "seeded"],
    ["Seeded", "seeded"],
    ["clean", "clean"],
    ["", "clean"],
    ["garbage", "clean"],
    ["read-only", "clean"],
    ["true", "clean"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeMode(input)).toBe(expected);
  });

  it("treats null and undefined as clean", () => {
    expect(normalizeMode(null)).toBe("clean");
    expect(normalizeMode(undefined)).toBe("clean");
  });
});

describe("getAppMode / isReadOnly / shouldSeed (env-driven)", () => {
  const original = process.env.PREPTRAC_MODE;

  afterEach(() => {
    if (original === undefined) delete process.env.PREPTRAC_MODE;
    else process.env.PREPTRAC_MODE = original;
  });

  it("demo mode is read-only and seeded", () => {
    process.env.PREPTRAC_MODE = "demo";
    expect(getAppMode()).toBe("demo");
    expect(isReadOnly()).toBe(true);
    expect(shouldSeed()).toBe(true);
  });

  it("seeded mode is writable but seeded", () => {
    process.env.PREPTRAC_MODE = "seeded";
    expect(getAppMode()).toBe("seeded");
    expect(isReadOnly()).toBe(false);
    expect(shouldSeed()).toBe(true);
  });

  it("clean mode is writable and not seeded", () => {
    process.env.PREPTRAC_MODE = "clean";
    expect(getAppMode()).toBe("clean");
    expect(isReadOnly()).toBe(false);
    expect(shouldSeed()).toBe(false);
  });

  it("unset falls back to clean", () => {
    delete process.env.PREPTRAC_MODE;
    expect(getAppMode()).toBe("clean");
    expect(isReadOnly()).toBe(false);
    expect(shouldSeed()).toBe(false);
  });

  it("empty string falls back to clean", () => {
    process.env.PREPTRAC_MODE = "";
    expect(getAppMode()).toBe("clean");
  });

  it("an unrecognized value falls back to clean and warns once", async () => {
    // Use a fresh module instance so the once-only warning flag is guaranteed
    // unset, regardless of what other tests called getAppMode first.
    vi.resetModules();
    process.env.PREPTRAC_MODE = "not-a-real-mode";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getAppMode, isReadOnly, shouldSeed } = await import("~/server/appMode");
    expect(getAppMode()).toBe("clean");
    expect(isReadOnly()).toBe(false);
    expect(shouldSeed()).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
