import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sendWebhook, type WebhookPayload } from "~/utils/webhooks";
import {
  collectDueAlerts,
  type AlertableItem,
} from "~/server/notifications";
import { env } from "~/env.mjs";
import * as nodemailer from "nodemailer";

export const notificationsRouter = createTRPCRouter({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    let settings = await ctx.prisma.notificationSettings.findUnique({
      where: { userId: ctx.userId },
    });

    const hasSmtpConfig = !!(
      env.SMTP_HOST &&
      env.SMTP_PORT &&
      env.SMTP_USER &&
      env.SMTP_PASSWORD
    );

    if (!settings) {
      settings = await ctx.prisma.notificationSettings.create({
        data: {
          userId: ctx.userId,
          emailEnabled: hasSmtpConfig,
        },
      });
    }

    return settings;
  }),

  updateSettings: protectedProcedure
    .input(
      z
        .object({
          emailEnabled: z.boolean().optional(),
          emailExpirationDays: z.number().optional(),
          emailMaintenanceDays: z.number().optional(),
          emailRotationDays: z.number().optional(),
          emailLowInventory: z.boolean().optional(),
          inAppEnabled: z.boolean().optional(),
          webhookEnabled: z.boolean().optional(),
          webhookUrl: z.preprocess((val) => val === "" ? null : val, z.string().url().nullable().optional()),
          webhookSecret: z.string().nullable().optional(),
          webhookExpirationDays: z.number().optional(),
          webhookMaintenanceDays: z.number().optional(),
          webhookRotationDays: z.number().optional(),
          webhookLowInventory: z.boolean().optional(),
          smtpHost: z.string().nullable().optional(),
          smtpPort: z.preprocess((val) => (val === "" || isNaN(Number(val))) ? null : Number(val), z.number().nullable().optional()),
          smtpUser: z.string().nullable().optional(),
          smtpPassword: z.string().nullable().optional(),
          smtpFrom: z.string().nullable().optional(),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notificationSettings.upsert({
        where: { userId: ctx.userId },
        create: {
          userId: ctx.userId,
          ...input,
        },
        update: input,
      });
    }),

  sendTestWebhook: protectedProcedure
    .mutation(async ({ ctx }) => {
      const settings = await ctx.prisma.notificationSettings.findUnique({
        where: { userId: ctx.userId },
      });

      if (!settings?.webhookEnabled || !settings.webhookUrl) {
        throw new Error("Webhook is not enabled or URL is not set");
      }

      const inSevenDays = new Date();
      inSevenDays.setDate(inSevenDays.getDate() + 7);
      const testPayload: WebhookPayload = {
        type: "expiration",
        message: "Emergency Water expires in 7 days",
        date: inSevenDays.toISOString(),
        timestamp: new Date().toISOString(),
        item: {
          id: "example-item-id",
          name: "Emergency Water",
          quantity: 10,
          unit: "gallons",
          category: "Water",
          location: "Basement",
          expirationDate: inSevenDays.toISOString(),
        },
      };
      const maintenanceExample: WebhookPayload = {
        type: "maintenance",
        message: "Generator needs scheduled maintenance",
        date: inSevenDays.toISOString(),
        timestamp: new Date().toISOString(),
        item: {
          id: "example-item-id-2",
          name: "Backup Generator",
          quantity: 1,
          unit: "each",
          category: "Fuel & Energy",
          location: "Garage",
        },
      };
      const examples = [testPayload, maintenanceExample];
      const payload = examples[Math.floor(Math.random() * examples.length)];
      if (!payload) throw new Error("No example payload");

      const result = await sendWebhook(
        settings.webhookUrl,
        payload,
        settings.webhookSecret ?? undefined
      );

      if (!result.success) {
        const msg = result.error ?? "Failed to send webhook";
        throw new Error(
          msg.includes("400")
            ? `${msg} Your endpoint may expect a different payload (e.g. Discord/Slack use their own format). See WEBHOOKS.md for PrepTrac's payload.`
            : msg
        );
      }

      return { success: true, message: "Test webhook sent successfully" };
    }),

  sendTestEmail: protectedProcedure.mutation(async ({ ctx }) => {
    const settings = await ctx.prisma.notificationSettings.findUnique({
      where: { userId: ctx.userId },
    });

    const smtpHost = settings?.smtpHost || env.SMTP_HOST;
    const smtpPort = settings?.smtpPort || env.SMTP_PORT;
    const smtpUser = settings?.smtpUser || env.SMTP_USER;
    const smtpPassword = settings?.smtpPassword || env.SMTP_PASSWORD;
    const smtpFrom = settings?.smtpFrom || env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      throw new Error("SMTP settings are not fully configured (missing host, port, user, or password)");
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true },
    });
    try {
      await transporter.sendMail({
        from: smtpFrom,
        to: user?.email ?? smtpUser,
        subject: "PrepTrac Test Email",
        text: "This is a test email from your PrepTrac installation. Your SMTP settings are working correctly!",
        html: "<p>This is a test email from your <strong>PrepTrac</strong> installation. Your SMTP settings are working correctly!</p>",
      });

      return { success: true, message: "Test email sent successfully" };
    } catch (error: unknown) {
      console.error("Failed to send test email:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to send test email");
    }
  }),

  getPendingNotifications: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.prisma.notificationSettings.findUnique({
      where: { userId: ctx.userId },
    });

    if (!settings || !settings.inAppEnabled) {
      return [];
    }

    const now = new Date();

    // In-app view reuses the email lead-time preferences (the single set of lead
    // times exposed in the UI) and the shared compute functions so the in-app
    // list stays consistent with the scheduled email/webhook deliveries.
    const items = await ctx.prisma.item.findMany({
      where: { userId: ctx.userId },
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

    const alerts = collectDueAlerts(
      alertable,
      {
        expirationDays: settings.emailExpirationDays,
        maintenanceDays: settings.emailMaintenanceDays,
        rotationDays: settings.emailRotationDays,
        lowInventory: settings.emailLowInventory,
      },
      now,
    ).map((a) => ({
      type: a.type,
      message: a.message,
      date: a.date,
      itemId: a.itemId,
    }));

    // Also surface upcoming calendar events within a 7-day window so the in-app
    // list reflects the calendar view (events may carry battery_replacement etc).
    const upcomingEvents = await ctx.prisma.event.findMany({
      where: {
        userId: ctx.userId,
        completed: false,
        date: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const eventAlerts = upcomingEvents.map((event) => ({
      type: event.type,
      message: event.title,
      date: event.date,
      eventId: event.id,
      itemId: event.itemId ?? undefined,
    }));

    // De-duplicate item-driven alerts that also appear as events (same item+type).
    const seen = new Set(alerts.map((a) => `${a.itemId}:${a.type}`));
    const merged = [
      ...alerts,
      ...eventAlerts.filter((a) => !a.itemId || !seen.has(`${a.itemId}:${a.type}`)),
    ];

    return merged.sort((a, b) => a.date.getTime() - b.date.getTime());
  }),
});

