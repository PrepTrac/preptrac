import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sendWebhook, type WebhookPayload } from "~/utils/webhooks";
import { prisma } from "~/server/db";

/**
 * Service function to send webhook notifications for various events
 * This can be called from other parts of the application
 */
export async function sendWebhookNotification(
  userId: string,
  payload: Omit<WebhookPayload, "timestamp">
) {
  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  });

  if (!settings?.webhookEnabled || !settings.webhookUrl) {
    return { sent: false, reason: "Webhook not enabled or URL not set" };
  }

  const fullPayload: WebhookPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
  };

  const result = await sendWebhook(
    settings.webhookUrl,
    fullPayload,
    settings.webhookSecret ?? undefined
  );

  return {
    sent: result.success,
    error: result.error,
  };
}

/**
 * Check and send webhook notifications for expiring items
 */
export async function checkAndSendExpirationWebhooks(userId: string) {
  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  });

  if (!settings?.webhookEnabled || !settings.webhookUrl) {
    return;
  }

  const expirationDate = new Date();
  expirationDate.setDate(
    expirationDate.getDate() + (settings.webhookExpirationDays ?? 7)
  );

  const expiringItems = await prisma.item.findMany({
    where: {
      userId,
      expirationDate: {
        lte: expirationDate,
        gte: new Date(),
      },
    },
    include: {
      category: true,
      location: true,
    },
  });

  for (const item of expiringItems) {
    const expirationDate = item.expirationDate;
    if (!expirationDate) continue;
    await sendWebhookNotification(userId, {
      type: "expiration",
      message: `${item.name} expires on ${expirationDate.toLocaleDateString()}`,
      date: expirationDate.toISOString(),
      itemId: item.id,
      item: {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category.name,
        location: item.location.name,
        expirationDate: expirationDate.toISOString(),
      },
    });
  }
}

/**
 * Check and send webhook notifications for maintenance
 */
export async function checkAndSendMaintenanceWebhooks(userId: string) {
  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  });

  if (!settings?.webhookEnabled || !settings.webhookUrl) {
    return;
  }

  const items = await prisma.item.findMany({
    where: {
      userId,
      maintenanceInterval: { not: null },
    },
    include: {
      category: true,
      location: true,
    },
  });

  const now = new Date();
  const maintenanceDays = settings.webhookMaintenanceDays ?? 3;

  for (const item of items) {
    if (!item.lastMaintenanceDate || !item.maintenanceInterval) continue;

    const nextMaintenance = new Date(item.lastMaintenanceDate);
    nextMaintenance.setDate(
      nextMaintenance.getDate() + item.maintenanceInterval
    );
    const notificationDate = new Date(nextMaintenance);
    notificationDate.setDate(notificationDate.getDate() - maintenanceDays);

    if (notificationDate <= now && nextMaintenance >= now) {
      await sendWebhookNotification(userId, {
        type: "maintenance",
        message: `${item.name} needs maintenance by ${nextMaintenance.toLocaleDateString()}`,
        date: nextMaintenance.toISOString(),
        itemId: item.id,
        item: {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category.name,
          location: item.location.name,
        },
      });
    }
  }
}

/**
 * Check and send webhook notifications for low inventory
 */
export async function checkAndSendLowInventoryWebhooks(userId: string) {
  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  });

  if (!settings?.webhookEnabled || !settings.webhookUrl) {
    return;
  }

  if (!settings.webhookLowInventory) {
    return;
  }

  const itemsWithThreshold = await prisma.item.findMany({
    where: {
      userId,
      minQuantity: { gt: 0 },
    },
    include: {
      category: true,
      location: true,
    },
  });

  for (const item of itemsWithThreshold) {
    if (item.quantity > item.minQuantity) continue;
    await sendWebhookNotification(userId, {
      type: "low_inventory",
      message: `${item.name} is running low (${item.quantity} ${item.unit} remaining)`,
      date: new Date().toISOString(),
      itemId: item.id,
      item: {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category.name,
        location: item.location.name,
      },
    });
  }
}

export const webhooksRouter = createTRPCRouter({
  // This router is mainly for internal use, but can be exposed if needed
});

