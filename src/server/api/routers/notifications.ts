import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sendWebhook, type WebhookPayload } from "~/utils/webhooks";

export const notificationsRouter = createTRPCRouter({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    let settings = await ctx.prisma.notificationSettings.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!settings) {
      settings = await ctx.prisma.notificationSettings.create({
        data: { userId: ctx.session.user.id },
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
        webhookUrl: z.string().url().nullable().optional(),
        webhookSecret: z.string().nullable().optional(),
        webhookExpirationDays: z.number().optional(),
        webhookMaintenanceDays: z.number().optional(),
        webhookRotationDays: z.number().optional(),
        webhookLowInventory: z.boolean().optional(),
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

