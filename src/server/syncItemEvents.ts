import type { PrismaClient } from "@prisma/client";

const EVENT_TYPES = ["expiration", "maintenance", "rotation"] as const;

type EventInput = {
  type: string;
  title: string;
  date: Date;
};

/** Build list of events to create/update from item fields */
function buildEventsToCreate(item: {
  name: string;
  expirationDate: Date | null;
  maintenanceInterval: number | null;
  lastMaintenanceDate: Date | null;
  rotationSchedule: number | null;
  lastRotationDate: Date | null;
}): EventInput[] {
  const eventsToCreate: EventInput[] = [];

  if (item.expirationDate) {
    eventsToCreate.push({
      type: "expiration",
      title: `${item.name} expires`,
      date: item.expirationDate,
    });
  }

  if (item.maintenanceInterval && item.lastMaintenanceDate) {
    const nextMaintenance = new Date(item.lastMaintenanceDate);
    nextMaintenance.setDate(nextMaintenance.getDate() + item.maintenanceInterval);
    eventsToCreate.push({
      type: "maintenance",
      title: `${item.name} maintenance`,
      date: nextMaintenance,
    });
  }

  if (item.rotationSchedule && item.lastRotationDate) {
    const nextRotation = new Date(item.lastRotationDate);
    nextRotation.setDate(nextRotation.getDate() + item.rotationSchedule);
    eventsToCreate.push({
      type: "rotation",
      title: `${item.name} rotation`,
      date: nextRotation,
    });
  }

  return eventsToCreate;
}

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
  const eventsToCreate = buildEventsToCreate(item);
  const typesWeWant = new Set(eventsToCreate.map((e) => e.type));
  const typesToRemove = EVENT_TYPES.filter((t) => !typesWeWant.has(t));

  const existingEvents = await prisma.event.findMany({
    where: {
      itemId: item.id,
      userId,
      type: { in: [...EVENT_TYPES] },
    },
  });

  const toUpdate: { id: string; title: string; date: Date }[] = [];
  const toCreate: EventInput[] = [];

  for (const event of eventsToCreate) {
    const existing = existingEvents.find((e) => e.type === event.type);
    if (existing?.completed) continue;
    if (existing) {
      toUpdate.push({ id: existing.id, title: event.title, date: event.date });
    } else {
      toCreate.push(event);
    }
  }

  await prisma.$transaction([
    ...(typesToRemove.length > 0
      ? [
          prisma.event.deleteMany({
            where: {
              itemId: item.id,
              userId,
              type: { in: typesToRemove },
              completed: false,
            },
          }),
        ]
      : []),
    ...toUpdate.map((u) =>
      prisma.event.update({
        where: { id: u.id },
        data: { title: u.title, date: u.date },
      })
    ),
    ...toCreate.map((e) =>
      prisma.event.create({
        data: {
          type: e.type,
          title: e.title,
          date: e.date,
          itemId: item.id,
          userId,
        },
      })
    ),
  ]);
}

type BulkItem = {
  id: string;
  name: string;
  expirationDate: Date | null;
  maintenanceInterval: number | null;
  lastMaintenanceDate: Date | null;
  rotationSchedule: number | null;
  lastRotationDate: Date | null;
};

/** Sync calendar events for multiple items in bulk (e.g. after CSV import). */
export async function syncItemEventsBulk(
  prisma: PrismaClient,
  userId: string,
  items: BulkItem[]
) {
  if (items.length === 0) return;

  const itemIds = items.map((i) => i.id);
  const existingEvents = await prisma.event.findMany({
    where: {
      itemId: { in: itemIds },
      userId,
      type: { in: [...EVENT_TYPES] },
    },
  });
  const existingByItemAndType = new Map<string, { id: string; completed: boolean }>();
  for (const e of existingEvents) {
    if (e.itemId) existingByItemAndType.set(`${e.itemId}:${e.type}`, { id: e.id, completed: e.completed });
  }

  const toDelete: { itemId: string; types: string[] }[] = [];
  const toUpdate: { id: string; title: string; date: Date }[] = [];
  const toCreate: { itemId: string; type: string; title: string; date: Date }[] = [];

  for (const item of items) {
    const eventsToCreate = buildEventsToCreate(item);
    const typesWeWant = new Set(eventsToCreate.map((e) => e.type));
    const typesToRemove = EVENT_TYPES.filter((t) => !typesWeWant.has(t));
    if (typesToRemove.length > 0) {
      toDelete.push({ itemId: item.id, types: typesToRemove });
    }
    for (const event of eventsToCreate) {
      const key = `${item.id}:${event.type}`;
      const existing = existingByItemAndType.get(key);
      if (existing?.completed) continue;
      if (existing) {
        toUpdate.push({ id: existing.id, title: event.title, date: event.date });
      } else {
        toCreate.push({
          itemId: item.id,
          type: event.type,
          title: event.title,
          date: event.date,
        });
      }
    }
  }

  await prisma.$transaction([
    ...toDelete.flatMap((d) =>
      d.types.length > 0
        ? [
            prisma.event.deleteMany({
              where: {
                itemId: d.itemId,
                userId,
                type: { in: d.types },
                completed: false,
              },
            }),
          ]
        : []
    ),
    ...toUpdate.map((u) =>
      prisma.event.update({
        where: { id: u.id },
        data: { title: u.title, date: u.date },
      })
    ),
    ...toCreate.map((e) =>
      prisma.event.create({
        data: {
          type: e.type,
          title: e.title,
          date: e.date,
          itemId: e.itemId,
          userId,
        },
      })
    ),
  ]);
}
