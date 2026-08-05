/**
 * Canonical event-type → badge style mapping.
 *
 * The event-type color mapping was duplicated (and had drifted in wording)
 * between the calendar page and `UpcomingEvents`. Both now source the badge
 * classes and the human label from here so the legend, calendar chips, and
 * event lists stay consistent.
 */

export type EventType =
  | "expiration"
  | "maintenance"
  | "rotation"
  | "battery_replacement";

/** Tailwind badge classes (bg + text, light + dark) for each event type. */
export const EVENT_BADGE_CLASSES: Record<EventType, string> = {
  expiration: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  maintenance:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  rotation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  battery_replacement:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

/** Solid swatch class (legend color dot) for each event type. */
export const EVENT_SWATCH_CLASSES: Record<EventType, string> = {
  expiration: "bg-red-100 dark:bg-red-900",
  maintenance: "bg-yellow-100 dark:bg-yellow-900",
  rotation: "bg-blue-100 dark:bg-blue-900",
  battery_replacement: "bg-purple-100 dark:bg-purple-900",
};

const DEFAULT_BADGE_CLASS =
  "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";

/** Badge classes for an event type (falls back to gray for unknown types). */
export function getEventBadgeClass(type: string): string {
  return (EVENT_BADGE_CLASSES as Record<string, string>)[type] ?? DEFAULT_BADGE_CLASS;
}

/** Swatch classes for an event type (falls back to gray for unknown types). */
export function getEventSwatchClass(type: string): string {
  return (
    (EVENT_SWATCH_CLASSES as Record<string, string>)[type] ?? "bg-gray-100 dark:bg-gray-700"
  );
}

/** Human-readable label, e.g. "battery_replacement" → "battery replacement". */
export function getEventLabel(type: string): string {
  return type.replace(/_/g, " ");
}
