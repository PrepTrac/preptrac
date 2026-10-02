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
  expiration: "bg-danger-soft text-danger",
  maintenance: "bg-caution-soft text-caution",
  rotation: "bg-success-soft text-success",
  battery_replacement: "bg-info-soft text-info",
};

/** The same semantic fills identify calendar legend entries. */
export const EVENT_SWATCH_CLASSES: Record<EventType, string> = {
  expiration: "bg-danger-soft", maintenance: "bg-caution-soft",
  rotation: "bg-success-soft", battery_replacement: "bg-info-soft",
};

export function getEventBadgeClass(type: string): string {
  return (EVENT_BADGE_CLASSES as Record<string, string>)[type] ?? "bg-surface text-ink";
}
export function getEventSwatchClass(type: string): string {
  return (EVENT_SWATCH_CLASSES as Record<string, string>)[type] ?? "bg-surface";
}

/** Human-readable label, e.g. "battery_replacement" → "battery replacement". */
export function getEventLabel(type: string): string {
  return type.replace(/_/g, " ");
}
