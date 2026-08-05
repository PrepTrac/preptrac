# Expiring Soon & Notification Policy

This document is the single source of truth for two related but **independent**
concepts that are easy to confuse:

1. The **"Expiring Soon"** UI concept (badges, list filters, dashboard widgets).
2. The **notification alert** system (email/webhook) driven by the scheduled runner.

They use *different* time windows on purpose.

---

## 1. "Expiring Soon" (UI)

**Definition.** An item is *expiring soon* when its expiration date is in the
half-open window `[now, now + EXPIRING_SOON_DAYS]`. Items that have *already*
expired are **not** considered "expiring soon" (they are expired).

**Constant.** `EXPIRING_SOON_DAYS = 30` — defined once in
`src/utils/inventory.ts` and reused everywhere the concept appears:

- `src/components/ItemCard.tsx` — the "Expiring Soon" badge (`isExpiringSoon`).
- `src/server/api/routers/items.ts` — `items.getAll({ expiringSoon: true })`.
- `src/server/api/routers/dashboard.ts` — the dashboard "Upcoming Expirations"
  widget.

Use the shared helpers (`isExpiringSoon`, `EXPIRING_SOON_DAYS`, `DAY_MS`) rather
than re-deriving `30 * 24 * 60 * 60 * 1000` inline, so the window can never drift
between surfaces.

> The UI window is intentionally a fixed 30 days and is **not** per-user
> configurable. It is a visibility aid, not an alert.

## 2. Notification alerts (email / webhook)

**Definition.** Alerts are delivered by the idempotent scheduled runner at
`/api/cron/notifications` (see `src/server/notifications.ts`). Each **channel**
(email, webhook) has its **own** per-type lead time stored on
`NotificationSettings`:

| Type         | Email field            | Webhook field            | Default |
| ------------ | ---------------------- | ------------------------ | ------- |
| Expiration   | `emailExpirationDays`  | `webhookExpirationDays`  | 7       |
| Maintenance  | `emailMaintenanceDays` | `webhookMaintenanceDays` | 3       |
| Rotation     | `emailRotationDays`    | `webhookRotationDays`    | 1       |
| Low inventory| `emailLowInventory` (toggle) | `webhookLowInventory` (toggle) | on |

An alert fires when the relevant date (expiration / next-maintenance /
next-rotation) falls in `[now, now + leadDays]` (low-inventory fires when
`minQuantity > 0 && quantity <= minQuantity`).

**Key point.** The default notification lead (7 days) is **shorter** than the UI
Expiring Soon window (30 days). So an item shows up as "Expiring Soon" in the UI
up to 30 days out, but only generates an email/webhook alert in the final 7 days
(by default). This is by design: the badge is informational; the alert is a call
to action.

## 3. Idempotency & dedup

The runner claims a `NotificationLog` row keyed by a unique `dedupKey`
(`<userId>:<channel>:<type>:<itemId>:<UTC event day>`) **before** delivering.
Once an alert is delivered successfully, the dedup key is permanently taken, so a
retried or overlapping scheduled run **never** sends a duplicate. Low-inventory
alerts key on the *current* UTC day, so they can fire once per day while the
condition persists.

## 4. Retry of transient failures

A delivery can fail transiently (SMTP down, webhook 5xx/timeout). The runner
retries a failed alert under a bounded, windowed policy so transient failures are
eventually delivered **without** breaking dedup for successes:

- Constants in `src/server/notifications.ts`:
  - `MAX_RETRY_ATTEMPTS = 5`
  - `RETRY_WINDOW_MS = 15 * 60 * 1000` (15 minutes)
- A prior **failure** for a dedup key is re-attempted on a later run only when
  `attemptCount < MAX_RETRY_ATTEMPTS` **and** at least `RETRY_WINDOW_MS` has
  elapsed since the last attempt.
- A prior **success** is never retried (dedup holds).
- After `MAX_RETRY_ATTEMPTS` failed attempts the alert is abandoned for that
  dedup key/day and recorded as failed in `NotificationLog`.

Because the scheduled task typically runs hourly/daily, a transient blip is
picked up on the next eligible run; a persistently-failing endpoint stops being
hammered after the cap.

## 5. Date / timezone notes

- Notification windows use **UTC** day math (`setUTCDate`/`dayKey`), so dedup
  keys are stable across host timezones.
- The UI Expiring Soon window uses wall-clock `Date` math (`isExpiringSoon`),
  which is appropriate for a user-facing badge. The two are deliberately not
  forced to the same timezone model.
