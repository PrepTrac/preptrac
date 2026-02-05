import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sendWebhook, type WebhookPayload } from "~/utils/webhooks";
import { env } from "~/env.mjs";
import * as nodemailer from "nodemailer";

export const notificationsRouter = createTRPCRouter({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    let settings = await ctx.prisma.notificationSettings.findUnique({
      where: { userId: ctx.session.user.id },
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
          userId: ctx.session.user.id,
          emailEnabled: hasSmtpConfig,
        },
      });
    }

    return settings;
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
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
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notificationSettings.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          ...input,
        },
        update: input,
      });
    }),

  sendTestWebhook: protectedProcedure
    .mutation(async ({ ctx }) => {
      const settings = await ctx.prisma.notificationSettings.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!settings?.webhookEnabled || !settings.webhookUrl) {
        throw new Error("Webhook is not enabled or URL is not set");
      }

      const testPayload: WebhookPayload = {
        type: "maintenance",
        message: "Test webhook from PrepTrac",
        date: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      const result = await sendWebhook(
        settings.webhookUrl,
        testPayload,
        settings.webhookSecret ?? undefined
      );

      if (!result.success) {
        throw new Error(result.error ?? "Failed to send webhook");
      }

      return { success: true, message: "Test webhook sent successfully" };
    }),

  sendTestEmail: protectedProcedure.mutation(async ({ ctx }) => {
    const settings = await ctx.prisma.notificationSettings.findUnique({
      where: { userId: ctx.session.user.id },
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

    try {
      await transporter.sendMail({
        from: smtpFrom,
        to: ctx.session.user.email ?? smtpUser,
        subject: "PrepTrac Test Email",
        text: "This is a test email from your PrepTrac installation. Your SMTP settings are working correctly!",
        html: "<p>This is a test email from your <strong>PrepTrac</strong> installation. Your SMTP settings are working correctly!</p>",
      });

      return { success: true, message: "Test email sent successfully" };
    } catch (error: any) {
      console.error("Failed to send test email:", error);
      throw new Error(error.message || "Failed to send test email");
    }
  }),

  getPendingNotifications: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.prisma.notificationSettings.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!settings || !settings.inAppEnabled) {
      return [];
    }

    const notifications: Array<{
      type: string;
      message: string;
      date: Date;
      itemId?: string;
      eventId?: string;
    }> = [];

    const now = new Date();

    // Expiration notifications
    if (settings.emailExpirationDays) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + settings.emailExpirationDays);

      const expiringItems = await ctx.prisma.item.findMany({
        where: {
          userId: ctx.session.user.id,
          expirationDate: {
            lte: expirationDate,
            gte: now,
          },
        },
      });

      for (const item of expiringItems) {
        notifications.push({
          type: "expiration",
          message: `${item.name} expires on ${item.expirationDate!.toLocaleDateString()}`,
          date: item.expirationDate!,
          itemId: item.id,
        });
      }
    }

    // Maintenance notifications
    if (settings.emailMaintenanceDays) {
      const items = await ctx.prisma.item.findMany({
        where: {
          userId: ctx.session.user.id,
          maintenanceInterval: { not: null },
        },
      });

      for (const item of items) {
        if (!item.lastMaintenanceDate || !item.maintenanceInterval) continue;
        const nextMaintenance = new Date(item.lastMaintenanceDate);
        nextMaintenance.setDate(nextMaintenance.getDate() + item.maintenanceInterval);
        const notificationDate = new Date(nextMaintenance);
        notificationDate.setDate(notificationDate.getDate() - settings.emailMaintenanceDays);

        if (notificationDate <= now && nextMaintenance >= now) {
          notifications.push({
            type: "maintenance",
            message: `${item.name} needs maintenance by ${nextMaintenance.toLocaleDateString()}`,
            date: nextMaintenance,
            itemId: item.id,
          });
        }
      }
    }

    // Upcoming events
    const upcomingEvents = await ctx.prisma.event.findMany({
      where: {
        userId: ctx.session.user.id,
        completed: false,
        date: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    for (const event of upcomingEvents) {
      notifications.push({
        type: event.type,
        message: event.title,
        date: event.date,
        eventId: event.id,
        itemId: event.itemId ?? undefined,
      });
    }

    return notifications.sort((a, b) => a.date.getTime() - b.date.getTime());
  }),
});

