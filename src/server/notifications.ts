/**
 * Scheduled notification engine.
 *
 * This module is the single source of truth for *which* alerts are due and *how*
 * they are delivered. It has three layers:
 *
 *  1. Pure compute functions (`computeExpirationAlerts`, …) — given a list of
 *     items and a lead time, they return the set of due alerts. These are
 *     timezone-independent (UTC) and unit-testable without a database.
 *  2. `collectDueAlerts` — fetches a user's items and combines the pure results
 *     for a given channel's lead times.
 *  3. `runScheduledNotifications` — the idempotent runner invoked by the
 *     `/api/cron/notifications` endpoint. For every user it computes due alerts
 *     per channel (email / webhook), claims a `NotificationLog` row keyed by a
 *     dedup key *before* sending, and only delivers when the claim succeeds. This
 *     makes the runner safe to re-run (Coolify retries, overlapping schedules):
 *     an alert is delivered at most once per (user, channel, type, item, event
 *     date).
 *
 * NOTE: This file deliberately avoids `setInterval`/in-process timers. Scheduling
 * is owned by the deploy platform (Coolify Scheduled Task) calling the cron
 * endpoint, which is correct for single-replica and multi-replica alike.
 */

import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "~/server/db";
import { sendWebhook, type WebhookPayload } from "~/utils/webhooks";
import { formatCSVDate } from "~/utils/dates";
import { env } from "~/env.mjs";
import * as nodemailer from "nodemailer";

export type AlertType =
  | "expiration"
  | "maintenance"
  | "rotation"
  | "low_inventory";

export type Channel = "email" | "webhook";

/** Subset of an Item needed to evaluate alert rules. */
export interface AlertableItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  expirationDate: Date | null;
  maintenanceInterval: number | null;
  lastMaintenanceDate: Date | null;
  rotationSchedule: number | null;
  lastRotationDate: Date | null;
}

/** Per-type lead times + low-inventory toggle for one channel. */
export interface LeadTimes {
  expirationDays: number | null;
  maintenanceDays: number | null;
  rotationDays: number | null;
  lowInventory: boolean;
}

export interface DueAlert {
  type: AlertType;
  message: string;
  /** The event date the alert refers to (expiration/maintenance/rotation date,
   *  or "now" for low-inventory). Used to build the dedup key. */
  date: Date;
  itemId: string;
}

/** UTC yyyy-MM-dd slice — stable across timezones for dedup keys. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function displayDate(date: Date): string {
  return formatCSVDate(date);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

/**
 * Expiration alerts: items whose expiration falls within `[now, now + leadDays]`.
 */
export function computeExpirationAlerts(
  items: AlertableItem[],
  leadDays: number | null,
  now: Date,
): DueAlert[] {
  if (!leadDays) return [];
  const horizon = new Date(now);
  horizon.setUTCDate(horizon.getUTCDate() + leadDays);

  const alerts: DueAlert[] = [];
  for (const item of items) {
    if (!item.expirationDate) continue;
    if (item.expirationDate >= now && item.expirationDate <= horizon) {
      alerts.push({
        type: "expiration",
        message: `${item.name} expires on ${displayDate(item.expirationDate)}`,
        date: item.expirationDate,
        itemId: item.id,
      });
    }
  }
  return alerts;
}

/**
 * Maintenance alerts: items with a maintenance interval whose next maintenance
 * date falls within the lead window and has not yet passed.
 */
export function computeMaintenanceAlerts(
  items: AlertableItem[],
  leadDays: number | null,
  now: Date,
): DueAlert[] {
  if (!leadDays) return [];
  const alerts: DueAlert[] = [];
  for (const item of items) {
    if (!item.lastMaintenanceDate || !item.maintenanceInterval) continue;
    const next = new Date(item.lastMaintenanceDate);
    next.setUTCDate(next.getUTCDate() + item.maintenanceInterval);
    const notifyFrom = new Date(next);
    notifyFrom.setUTCDate(notifyFrom.getUTCDate() - leadDays);
    if (notifyFrom <= now && next >= now) {
      alerts.push({
        type: "maintenance",
        message: `${item.name} needs maintenance by ${displayDate(next)}`,
        date: next,
        itemId: item.id,
      });
    }
  }
  return alerts;
}

/**
 * Rotation alerts: items with a rotation schedule whose next rotation date falls
 * within the lead window and has not yet passed.
 */
export function computeRotationAlerts(
  items: AlertableItem[],
  leadDays: number | null,
  now: Date,
): DueAlert[] {
  if (!leadDays) return [];
  const alerts: DueAlert[] = [];
  for (const item of items) {
    if (!item.lastRotationDate || !item.rotationSchedule) continue;
    const next = new Date(item.lastRotationDate);
    next.setUTCDate(next.getUTCDate() + item.rotationSchedule);
    const notifyFrom = new Date(next);
    notifyFrom.setUTCDate(notifyFrom.getUTCDate() - leadDays);
    if (notifyFrom <= now && next >= now) {
      alerts.push({
        type: "rotation",
        message: `${item.name} should be rotated by ${displayDate(next)}`,
        date: next,
        itemId: item.id,
      });
    }
  }
  return alerts;
}

/**
 * Low-inventory alerts: items at/below their explicit low-inventory threshold.
 * Mirrors `src/utils/inventory.ts` `isLowInventory` (minQuantity > 0 && qty <= min).
 */
export function computeLowInventoryAlerts(
  items: AlertableItem[],
  enabled: boolean,
  now: Date,
): DueAlert[] {
  if (!enabled) return [];
  const alerts: DueAlert[] = [];
  for (const item of items) {
    if (item.minQuantity > 0 && item.quantity <= item.minQuantity) {
      alerts.push({
        type: "low_inventory",
        message: `${item.name} is running low (${item.quantity} ${item.unit} remaining)`,
        date: now,
        itemId: item.id,
      });
    }
  }
  return alerts;
}

/** Combine all alert types for a channel using its lead-time preferences. */
export function collectDueAlerts(
  items: AlertableItem[],
  lead: LeadTimes,
  now: Date,
): DueAlert[] {
  return [
    ...computeExpirationAlerts(items, lead.expirationDays, now),
    ...computeMaintenanceAlerts(items, lead.maintenanceDays, now),
    ...computeRotationAlerts(items, lead.rotationDays, now),
    ...computeLowInventoryAlerts(items, lead.lowInventory, now),
  ];
}

/** Build the unique dedup key that makes delivery idempotent. */
export function dedupKey(
  userId: string,
  channel: Channel,
  alert: DueAlert,
): string {
  return `${userId}:${channel}:${alert.type}:${alert.itemId}:${dayKey(alert.date)}`;
}

/** Resolve SMTP transport config from per-user settings with env fallback. */
interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

function resolveSmtp(
  settings: {
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPassword: string | null;
    smtpFrom: string | null;
  } | null,
): SmtpConfig | null {
  const host = settings?.smtpHost || env.SMTP_HOST;
  const port = settings?.smtpPort || env.SMTP_PORT;
  const user = settings?.smtpUser || env.SMTP_USER;
  const password = settings?.smtpPassword || env.SMTP_PASSWORD;
  const from = settings?.smtpFrom || env.SMTP_FROM || user;
  if (!host || !port || !user || !password) return null;
  return { host, port, user, password, from: from || user };
}

async function sendEmailAlert(
  smtp: SmtpConfig,
  to: string,
  alert: DueAlert,
  item?: { category?: string | null; location?: string | null },
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.password },
    });
    const subject = `PrepTrac alert: ${alert.message}`;
    const lines = [
      alert.message,
      "",
      item?.category ? `Category: ${item.category}` : null,
      item?.location ? `Location: ${item.location}` : null,
      `Type: ${alert.type}`,
      `Date: ${displayDate(alert.date)}`,
    ].filter((l): l is string => l !== null);
    await transporter.sendMail({
      from: smtp.from,
      to,
      subject,
      text: lines.join("\n"),
      html: `<p>${escapeHtml(alert.message)}</p><ul>${lines
        .slice(2)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("")}</ul>`,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export interface SendOutcome {
  sent: number;
  skipped: number;
  errors: string[];
}

/**
 * Idempotent scheduled runner. Processes every user, computes due alerts per
 * channel, and delivers each at most once via the NotificationLog dedup key.
 *
 * Claim-first: a `NotificationLog` row is created *before* delivery. If the
 * unique key already exists (Prisma P2002) the alert was already delivered, so
 * it is skipped — even under overlapping/retried runs.
 */
export async function runScheduledNotifications(
  client: PrismaClient = prisma,
  now: Date = new Date(),
): Promise<SendOutcome & { processedUsers: number }> {
  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  const users = await client.user.findMany({ select: { id: true, email: true } });

  for (const user of users) {
    const settings = await client.notificationSettings.findUnique({
      where: { userId: user.id },
    });
    if (!settings) continue; // user never opened notification settings

    const items = await client.item.findMany({
      where: { userId: user.id },
      include: { category: true, location: true },
    });

    const alertable: AlertableItem[] = items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      minQuantity: i.minQuantity,
      expirationDate: i.expirationDate,
      maintenanceInterval: i.maintenanceInterval,
      lastMaintenanceDate: i.lastMaintenanceDate,
      rotationSchedule: i.rotationSchedule,
      lastRotationDate: i.lastRotationDate,
    }));
    const itemById = new Map(items.map((i) => [i.id, i]));

    const channels: Array<{
      channel: Channel;
      enabled: boolean;
      lead: LeadTimes;
    }> = [
      {
        channel: "email",
        enabled: settings.emailEnabled,
        lead: {
          expirationDays: settings.emailExpirationDays,
          maintenanceDays: settings.emailMaintenanceDays,
          rotationDays: settings.emailRotationDays,
          lowInventory: settings.emailLowInventory,
        },
      },
      {
        channel: "webhook",
        enabled: settings.webhookEnabled && !!settings.webhookUrl,
        lead: {
          expirationDays: settings.webhookExpirationDays,
          maintenanceDays: settings.webhookMaintenanceDays,
          rotationDays: settings.webhookRotationDays,
          lowInventory: settings.webhookLowInventory,
        },
      },
    ];

    for (const { channel, enabled, lead } of channels) {
      if (!enabled) continue;
      const alerts = collectDueAlerts(alertable, lead, now);
      for (const alert of alerts) {
        const key = dedupKey(user.id, channel, alert);

        // Claim-first: insert the log row; P2002 means already delivered.
        try {
          await client.notificationLog.create({
            data: {
              userId: user.id,
              dedupKey: key,
              channel,
              type: alert.type,
              itemId: alert.itemId,
              message: alert.message,
              success: false, // marked true only after successful delivery
            },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            skipped++;
            continue;
          }
          throw e;
        }

        const detail = itemById.get(alert.itemId);
        let outcome: { success: boolean; error?: string };
        if (channel === "email") {
          const smtp = resolveSmtp(settings);
          if (!smtp) {
            outcome = { success: false, error: "SMTP not configured" };
          } else {
            outcome = await sendEmailAlert(
              smtp,
              user.email,
              alert,
              detail
                ? { category: detail.category?.name, location: detail.location?.name }
                : undefined,
            );
          }
        } else {
          const payload: WebhookPayload = {
            type: alert.type,
            message: alert.message,
            date: alert.date.toISOString(),
            itemId: alert.itemId,
            timestamp: now.toISOString(),
            item: detail
              ? {
                  id: detail.id,
                  name: detail.name,
                  quantity: detail.quantity,
                  unit: detail.unit,
                  category: detail.category?.name,
                  location: detail.location?.name,
                  expirationDate: detail.expirationDate?.toISOString(),
                }
              : undefined,
          };
          outcome = await sendWebhook(
            settings.webhookUrl!,
            payload,
            settings.webhookSecret ?? undefined,
          );
        }

        // Record the delivery outcome on the claimed log row.
        await client.notificationLog.update({
          where: { dedupKey: key },
          data: {
            success: outcome.success,
            error: outcome.success ? null : (outcome.error ?? "Unknown error"),
          },
        });

        if (outcome.success) {
          sent++;
        } else {
          errors.push(
            `${channel}/${alert.type}/${alert.itemId}: ${outcome.error ?? "unknown"}`,
          );
        }
      }
    }
  }

  return { sent, skipped, errors, processedUsers: users.length };
}
