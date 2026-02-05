import type { PrismaClient } from "@prisma/client";

/** Sync calendar events from an item's expiration, maintenance, and rotation dates */
export async function syncItemEvents(
  prisma: PrismaClient,
  userId: string,
  item: {
    id: string;
    name: string;
    expirationDate: Date | null;
    maintenanceInterval: number | null;
    lastMaintenanceDate: Date | null;
    rotationSchedule: number | null;
    lastRotationDate: Date | null;
  }
) {
  const eventsToCreate: { type: string; title: string; date: Date }[] = [];

  // Expiration event
  if (item.expirationDate) {
    eventsToCreate.push({
      type: "expiration",
      title: `${item.name} expires`,
      date: item.expirationDate,
    });
  }

  // Next maintenance event
  if (item.maintenanceInterval && item.lastMaintenanceDate) {
    const nextMaintenance = new Date(item.lastMaintenanceDate);
    nextMaintenance.setDate(nextMaintenance.getDate() + item.maintenanceInterval);
    eventsToCreate.push({
      type: "maintenance",
      title: `${item.name} maintenance`,
      date: nextMaintenance,
    });
  }

  // Next rotation event
  if (item.rotationSchedule && item.lastRotationDate) {
    const nextRotation = new Date(item.lastRotationDate);
    nextRotation.setDate(nextRotation.getDate() + item.rotationSchedule);
    eventsToCreate.push({
      type: "rotation",
      title: `${item.name} rotation`,
      date: nextRotation,
    });
  }

  for (const event of eventsToCreate) {
    const existing = await prisma.event.findFirst({
      where: {
        itemId: item.id,
        userId,
        type: event.type,
      },
    });

    if (existing?.completed) {
      // Don't modify completed events
      continue;
    }

    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: { title: event.title, date: event.date },
      });
    } else {
      await prisma.event.create({
        data: {
          type: event.type,
          title: event.title,
          date: event.date,
          itemId: item.id,
          userId,
        },
      });
    }
  }

  // Remove events for types no longer applicable (e.g. expirationDate was cleared)
  const eventTypes = ["expiration", "maintenance", "rotation"] as const;
  const typesWeWant = new Set(eventsToCreate.map((e) => e.type));
  const typesToRemove = eventTypes.filter((t) => !typesWeWant.has(t));

  if (typesToRemove.length > 0) {
    await prisma.event.deleteMany({
      where: {
        itemId: item.id,
        userId,
        type: { in: typesToRemove },
        completed: false,
      },
    });
  }
}
