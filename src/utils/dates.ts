/**
 * Deterministic date helpers.
 *
 * Dates are stored as UTC instants (e.g. `2026-01-15T00:00:00.000Z`). Formatting
 * with timezone-aware helpers (e.g. date-fns `format`) makes the output depend on
 * the machine's local timezone, so the same stored value renders differently on a
 * dev laptop vs. the Coolify container. These helpers derive every component from
 * the UTC parts of the instant, so output is reproducible regardless of the
 * server timezone.
 */

type DateInput = Date | string | null | undefined;

function toDate(val: DateInput): Date | null {
  if (val == null || val === "") return null;
  const d = val instanceof Date ? val : new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

/** CSV export format: M/d/yyyy derived from UTC parts (e.g. 1/15/2026). */
export function formatCSVDate(val: DateInput): string {
  const d = toDate(val);
  if (!d) return "";
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}

/**
 * Value for an `<input type="date">`: yyyy-MM-dd derived from UTC parts.
 * Round-trips with the form's `new Date(value).toISOString()` (a date-only string
 * is parsed as UTC midnight), so the selected calendar day is preserved.
 */
export function toDateInputValue(val: DateInput): string {
  const d = toDate(val);
  if (!d) return "";
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}
