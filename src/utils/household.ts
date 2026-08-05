/**
 * Shared household (Mifflin-St Jeor) and activity-level calculations.
 *
 * Previously the BMR equation and the activity-level multiplier tables were
 * duplicated between `householdRouter` and `dashboardRouter`, which let them
 * drift. Both server routers now import these single definitions so calorie and
 * water estimates stay identical everywhere they appear.
 */

export type ActivityLevel = "moderate" | "very_active" | "extra_active";

/** BMR calorie multipliers per activity level (BMR × factor). */
export const ACTIVITY_CALORIE_FACTOR: Record<ActivityLevel, number> = {
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

/** Water intake (US fl oz per lb of body weight) per activity level. */
export const ACTIVITY_WATER_OZ_PER_LB: Record<ActivityLevel, number> = {
  moderate: 0.65,
  very_active: 0.75,
  extra_active: 0.85,
};

/** Water intake for the base / sedentary (no activity level set) case. */
export const DEFAULT_WATER_OZ_PER_LB = 0.5;

/** Standard US fl oz in a gallon (used for the days-of-water estimate). */
export const FL_OZ_PER_GALLON = 128;

/** Pounds per kilogram (household body weight is stored in kg). */
export const LB_PER_KG = 2.20462;

/**
 * Mifflin-St Jeor equation: basal metabolic rate in kcal/day.
 * Clamped at 0 so a malformed record can never produce a negative need.
 */
export function bmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: string,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const value = sex.toLowerCase() === "female" ? base - 161 : base + 5;
  return Math.max(0, Math.round(value));
}

/** Calorie factor for a stored activity level (1.0 when unset/sedentary). */
export function calorieFactorFor(
  activityLevel: string | null | undefined,
): number {
  return activityLevel && activityLevel in ACTIVITY_CALORIE_FACTOR
    ? ACTIVITY_CALORIE_FACTOR[activityLevel as ActivityLevel]
    : 1;
}

/** Water (fl oz per lb) for a stored activity level (base value when unset). */
export function waterOzPerLbFor(
  activityLevel: string | null | undefined,
): number {
  return activityLevel && activityLevel in ACTIVITY_WATER_OZ_PER_LB
    ? ACTIVITY_WATER_OZ_PER_LB[activityLevel as ActivityLevel]
    : DEFAULT_WATER_OZ_PER_LB;
}
