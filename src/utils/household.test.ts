import { describe, it, expect } from "vitest";
import {
  bmr,
  calorieFactorFor,
  waterOzPerLbFor,
  ACTIVITY_CALORIE_FACTOR,
  ACTIVITY_WATER_OZ_PER_LB,
  DEFAULT_WATER_OZ_PER_LB,
  LB_PER_KG,
  FL_OZ_PER_GALLON,
} from "~/utils/household";

describe("household calculations", () => {
  describe("bmr (Mifflin-St Jeor)", () => {
    it("computes male BMR (base + 5)", () => {
      // 10*70 + 6.25*175 - 5*30 = 700 + 1093.75 - 150 = 1643.75; +5 = 1648.75 → 1649
      expect(bmr(70, 175, 30, "male")).toBe(1649);
    });

    it("computes female BMR (base - 161)", () => {
      // 1643.75 - 161 = 1482.75 → 1483
      expect(bmr(70, 175, 30, "female")).toBe(1483);
    });

    it("is case-insensitive for sex", () => {
      expect(bmr(70, 175, 30, "FEMALE")).toBe(1483);
    });

    it("clamps a negative result to 0", () => {
      expect(bmr(0, 0, 200, "male")).toBe(0);
    });
  });

  describe("activity factors", () => {
    it("returns the calorie multiplier for a known level", () => {
      expect(calorieFactorFor("moderate")).toBe(ACTIVITY_CALORIE_FACTOR.moderate);
      expect(calorieFactorFor("very_active")).toBe(1.725);
      expect(calorieFactorFor("extra_active")).toBe(1.9);
    });

    it("defaults to 1.0 when no level is set", () => {
      expect(calorieFactorFor(null)).toBe(1);
      expect(calorieFactorFor(undefined)).toBe(1);
    });

    it("defaults to 1.0 for an unknown level", () => {
      expect(calorieFactorFor("couch_potato")).toBe(1);
    });
  });

  describe("water intake", () => {
    it("returns oz/lb for a known level", () => {
      expect(waterOzPerLbFor("moderate")).toBe(ACTIVITY_WATER_OZ_PER_LB.moderate);
      expect(waterOzPerLbFor("very_active")).toBe(0.75);
    });

    it("falls back to the sedentary default when unset/unknown", () => {
      expect(waterOzPerLbFor(null)).toBe(DEFAULT_WATER_OZ_PER_LB);
      expect(waterOzPerLbFor("unknown")).toBe(DEFAULT_WATER_OZ_PER_LB);
    });
  });

  it("exposes the shared unit conversion constants", () => {
    expect(LB_PER_KG).toBe(2.20462);
    expect(FL_OZ_PER_GALLON).toBe(128);
  });
});
