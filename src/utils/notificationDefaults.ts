/**
 * Canonical notification lead-time defaults (days before an event).
 *
 * These mirror the `@default(...)` values on the `NotificationSettings` model in
 * `prisma/schema.prisma`. The email fields are non-nullable in the schema, but
 * the webhook lead-time fields are nullable, so UI fallbacks and the form's
 * initial values source the constants from here instead of re-hardcoding 7/3/1.
 */
export const DEFAULT_EXPIRATION_DAYS = 7;
export const DEFAULT_MAINTENANCE_DAYS = 3;
export const DEFAULT_ROTATION_DAYS = 1;
