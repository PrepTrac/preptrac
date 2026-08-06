/**
 * Unified inventory classification + threshold helpers.
 *
 * "Low inventory" is defined consistently across the app as: an item has an
 * explicit low-inventory threshold set (minQuantity > 0) and its current quantity
 * is at or below that threshold. This matches:
 *  - `items.getAll({ lowInventory })` SQL filter in src/server/api/routers/items.ts
 *  - the low-inventory alert in src/server/notifications.ts `computeLowInventoryAlerts`
 *
 * Items without a threshold are never flagged low (the legacy `quantity <= 10`
 * fallback is intentionally removed so behavior is consistent everywhere).
 */

/** Canonical category kinds used for dashboard goal aggregation. */
export type CategoryKind = "ammo" | "water" | "food" | "fuel" | "other";

/** All valid `Category.kind` values (also the form dropdown options). */
export const CATEGORY_KINDS: CategoryKind[] = [
  "ammo",
  "water",
  "food",
  "fuel",
  "other",
];

/** Human-readable label for a category kind (used in the category form). */
export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  ammo: "Ammo",
  water: "Water",
  food: "Food",
  fuel: "Fuel & Energy",
  other: "Other",
};

export interface InventoryQuantity {
  quantity: number;
  minQuantity: number;
}

/** True when an item is at/below its low-inventory threshold. */
export function isLowInventory(item: InventoryQuantity): boolean {
  return item.minQuantity > 0 && item.quantity <= item.minQuantity;
}

/**
 * Infer a category kind from its name. Used only as a backfill/fallback for rows
 * whose `kind` column is null (e.g. pre-existing data created before the `kind`
 * field existed). The canonical source is `Category.kind`; this keeps old data
 * working without a destructive migration.
 */
export function inferCategoryKindFromName(name: string): CategoryKind {
  const lower = name.toLowerCase();
  if (lower.includes("ammo")) return "ammo";
  if (lower.includes("water")) return "water";
  if (lower.includes("food")) return "food";
  if (lower.includes("fuel") || lower.includes("energy")) return "fuel";
  return "other";
}

/**
 * Resolve the canonical kind for a category. An explicit `kind` always wins; a
 * null/empty/invalid `kind` falls back to name-based inference so existing data
 * keeps aggregating correctly until `kind` is backfilled.
 *
 * This is the single source of truth for category classification — the dashboard
 * and any classification code should call this instead of inlining name-substring
 * checks.
 */
export function resolveCategoryKind(cat: {
  kind?: string | null;
  name: string;
}): CategoryKind {
  const kind = cat.kind?.trim().toLowerCase();
  if (kind && (CATEGORY_KINDS as string[]).includes(kind)) {
    return kind as CategoryKind;
  }
  return inferCategoryKindFromName(cat.name);
}

/**
 * "Expiring Soon" policy.
 *
 * The UI "Expiring Soon" badge and list filters use a single fixed window of
 * {@link EXPIRING_SOON_DAYS} days from now: an item is "expiring soon" when its
 * expiration date is in `[now, now + EXPIRING_SOON_DAYS]` (already-expired items
 * are excluded). This is independent of the *notification* alert lead times,
 * which are per-channel (email/webhook) and default to 7 days — see
 * `docs/NOTIFICATION_AND_EXPIRATION_POLICY.md`.
 */
export const EXPIRING_SOON_DAYS = 30;

/** One day in milliseconds, for date-window math. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** True when an item's expiration falls within the Expiring Soon window. */
export function isExpiringSoon(
  item: { expirationDate: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (!item.expirationDate) return false;
  const date =
    item.expirationDate instanceof Date
      ? item.expirationDate
      : new Date(item.expirationDate);
  if (isNaN(date.getTime())) return false;
  const horizon = new Date(now.getTime() + EXPIRING_SOON_DAYS * DAY_MS);
  return date >= now && date <= horizon;
}

/** Fields needed to evaluate whether an item is due for maintenance. */
export interface MaintenanceSchedule {
  maintenanceInterval: number | null;
  lastMaintenanceDate: Date | string | null;
}

/**
 * True when an item is due for maintenance: its last service date plus the
 * interval has passed. Matches the server-side filter in `items.getAll({
 * needsMaintenance })` (`datetime(lastMaintenanceDate, '+' || interval || ' days')
 * <= datetime('now')`), so the UI badge and the query stay consistent. Items
 * with no interval or no recorded service date are never flagged.
 */
export function needsMaintenance(
  item: MaintenanceSchedule,
  now: Date = new Date(),
): boolean {
  if (!item.maintenanceInterval || !item.lastMaintenanceDate) return false;
  const last =
    item.lastMaintenanceDate instanceof Date
      ? item.lastMaintenanceDate
      : new Date(item.lastMaintenanceDate);
  if (isNaN(last.getTime())) return false;
  const due = new Date(last.getTime() + item.maintenanceInterval * DAY_MS);
  return due <= now;
}
