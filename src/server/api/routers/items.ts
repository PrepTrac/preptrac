import { z } from "zod";
import { type Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { syncItemEvents } from "~/server/syncItemEvents";

/** Parse a single CSV line with quoted fields ("" for escaped quote). */
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          i++;
          if (line[i] === '"') {
            field += '"';
            i++;
          } else {
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      out.push(field);
      if (line[i] === ",") i++;
    } else {
      let field = "";
      while (i < line.length && line[i] !== ",") {
        field += line[i];
        i++;
      }
      out.push(field.trim());
      if (line[i] === ",") i++;
    }
  }
  return out;
}

/** Parse CSV string into array of row objects (first row = headers). */
function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]!);
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const values = parseCSVLine(lines[r]!);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

export const itemsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          categoryId: z.string().optional(),
          locationId: z.string().optional(),
          search: z.string().optional(),
          expiringSoon: z.boolean().optional(),
          lowInventory: z.boolean().optional(),
          needsMaintenance: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.userId,
      };

      if (input?.categoryId) {
        where.categoryId = input.categoryId;
      }

      if (input?.locationId) {
        where.locationId = input.locationId;
      }

      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input?.expiringSoon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        where.expirationDate = {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        };
      }

      if (input?.lowInventory) {
        // Find items where quantity is less than or equal to minQuantity
        // Since Prisma can't compare fields within a where clause, we need to fetch and filter
        const items = await ctx.prisma.item.findMany({
          where: {
            userId: ctx.userId,
          },
        });

        const itemIds = items
          .filter((item) => {
            if (item.minQuantity > 0) {
              return item.quantity <= item.minQuantity;
            } else if (item.minQuantity === 0) {
              return item.quantity <= 10;
            }
            return false;
          })
          .map((item) => item.id);

        where.id = { in: itemIds };
      }

      if (input?.needsMaintenance) {
        const items = await ctx.prisma.item.findMany({
          where: {
            userId: ctx.userId,
            maintenanceInterval: { not: null },
          },
        });

        const now = new Date();
        const itemIds = items
          .filter((item) => {
            if (!item.maintenanceInterval || !item.lastMaintenanceDate) return false;
            const nextMaintenance = new Date(item.lastMaintenanceDate);
            nextMaintenance.setDate(nextMaintenance.getDate() + item.maintenanceInterval);
            return nextMaintenance <= now;
          })
          .map((item) => item.id);

        where.id = { in: itemIds };
      }

      return ctx.prisma.item.findMany({
        where,
        include: {
          category: true,
          location: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.item.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          category: true,
          location: true,
        },
      });
    }),

  getRecentConsumption: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.consumptionLog.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 25,
        include: {
          item: {
            select: { id: true, name: true, unit: true },
          },
        },
      });
    }),

  getConsumptionStats: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(730),
        categoryIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      startDate.setHours(0, 0, 0, 0);

      const logs = await ctx.prisma.consumptionLog.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
          ...(input.categoryIds?.length
            ? { item: { categoryId: { in: input.categoryIds } } }
            : {}),
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              unit: true,
              categoryId: true,
              category: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const timeSeriesByDate = new Map<
        string,
        { itemId: string; quantity: number }[]
      >();
      const totalsByItemId = new Map<
        string,
        {
          itemId: string;
          itemName: string;
          unit: string;
          categoryId: string;
          categoryName: string;
          quantity: number;
        }
      >();

      for (const log of logs) {
        const dateKey = new Date(log.createdAt).toISOString().slice(0, 10);
        if (!timeSeriesByDate.has(dateKey)) {
          timeSeriesByDate.set(dateKey, []);
        }
        const dayItems = timeSeriesByDate.get(dateKey)!;
        const existing = dayItems.find((i) => i.itemId === log.itemId);
        if (existing) {
          existing.quantity += log.quantity;
        } else {
          dayItems.push({ itemId: log.itemId, quantity: log.quantity });
        }

        const cur = totalsByItemId.get(log.itemId);
        if (cur) {
          cur.quantity += log.quantity;
        } else {
          totalsByItemId.set(log.itemId, {
            itemId: log.itemId,
            itemName: log.item.name,
            unit: log.item.unit,
            categoryId: log.item.categoryId,
            categoryName: log.item.category.name,
            quantity: log.quantity,
          });
        }
      }

      const sortedDates = Array.from(timeSeriesByDate.keys()).sort();
      const timeSeries = sortedDates.map((date) => ({
        date,
        byItem: timeSeriesByDate.get(date) ?? [],
      }));
      const totalsByItem = Array.from(totalsByItemId.values());

      return { timeSeries, totalsByItem };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        quantity: z.number().default(0),
        unit: z.string().min(1),
        categoryId: z.string(),
        locationId: z.string(),
        expirationDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
        maintenanceInterval: z.number().optional(),
        lastMaintenanceDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
        rotationSchedule: z.number().optional(),
        lastRotationDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
        notes: z.string().optional(),
        imageUrl: z.string().optional(),
        qrCode: z.string().optional(),
        minQuantity: z.number().default(0),
        targetQuantity: z.number().default(0),
        caloriesPerUnit: z.number().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.item.create({
        data: {
          ...input,
          userId: ctx.userId,
        },
        include: {
          category: true,
          location: true,
        },
      });

      await syncItemEvents(ctx.prisma, ctx.userId, item);
      return item;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        categoryId: z.string().optional(),
        locationId: z.string().optional(),
        expirationDate: z.string().nullable().optional().transform((val) => val ? new Date(val) : null),
        maintenanceInterval: z.number().nullable().optional(),
        lastMaintenanceDate: z.string().nullable().optional().transform((val) => val ? new Date(val) : null),
        rotationSchedule: z.number().nullable().optional(),
        lastRotationDate: z.string().nullable().optional().transform((val) => val ? new Date(val) : null),
        notes: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        qrCode: z.string().nullable().optional(),
        minQuantity: z.number().optional(),
        targetQuantity: z.number().optional(),
        caloriesPerUnit: z.number().positive().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const item = await ctx.prisma.item.update({
        where: { id },
        data,
        include: {
          category: true,
          location: true,
        },
      });

      await syncItemEvents(ctx.prisma, ctx.userId, item);
      return item;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.item.delete({
        where: { id: input.id },
      });
    }),

  /** Record consumption of an item: decrement quantity and log the consumption. */
  consume: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        quantity: z.number().positive(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const item = await ctx.prisma.item.findFirst({
        where: { id: input.itemId, userId },
        include: { category: true, location: true },
      });
      if (!item) {
        throw new Error("Item not found");
      }
      if (input.quantity > item.quantity) {
        throw new Error(
          `Not enough quantity. Available: ${item.quantity} ${item.unit}`
        );
      }
      const newQuantity = item.quantity - input.quantity;
      await ctx.prisma.$transaction([
        ctx.prisma.item.update({
          where: { id: input.itemId },
          data: { quantity: newQuantity },
        }),
        ctx.prisma.consumptionLog.create({
          data: {
            itemId: input.itemId,
            userId,
            quantity: input.quantity,
            note: input.note ?? null,
          },
        }),
      ]);
      return ctx.prisma.item.findFirstOrThrow({
        where: { id: input.itemId, userId },
        include: { category: true, location: true },
      });
    }),

  /** Record consumption of multiple items in one go (e.g. "range day" log). */
  consumeMany: protectedProcedure
    .input(
      z.object({
        entries: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().positive(),
            note: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const results: { itemId: string; success: boolean; error?: string }[] = [];
      const updates: Prisma.PrismaPromise<any>[] = [];
      const items = await ctx.prisma.item.findMany({
        where: {
          id: { in: input.entries.map((e) => e.itemId) },
          userId,
        },
        include: { category: true, location: true },
      });
      const itemMap = new Map(items.map((i) => [i.id, i]));
      for (const entry of input.entries) {
        const item = itemMap.get(entry.itemId);
        if (!item) {
          results.push({ itemId: entry.itemId, success: false, error: "Item not found" });
          continue;
        }
        if (entry.quantity > item.quantity) {
          results.push({
            itemId: entry.itemId,
            success: false,
            error: `Not enough quantity. Available: ${item.quantity} ${item.unit}`,
          });
          continue;
        }
        results.push({ itemId: entry.itemId, success: true });
        const newQuantity = item.quantity - entry.quantity;
        updates.push(
          ctx.prisma.item.update({
            where: { id: entry.itemId },
            data: { quantity: newQuantity },
          }),
          ctx.prisma.consumptionLog.create({
            data: {
              itemId: entry.itemId,
              userId,
              quantity: entry.quantity,
              note: entry.note ?? null,
            },
          })
        );
      }
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        const messages = failed.map((f) => f.error).filter(Boolean);
        throw new Error(messages.join("; ") || "Validation failed");
      }
      await ctx.prisma.$transaction(updates);
      return ctx.prisma.item.findMany({
        where: {
          id: { in: input.entries.map((e) => e.itemId) },
          userId,
        },
        include: { category: true, location: true },
      });
    }),

  /** Import items from CSV (same columns as export/template). Resolves category/location by name or ID. */
  importFromCSV: protectedProcedure
    .input(z.object({ csvContent: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const rows = parseCSV(input.csvContent);
      if (rows.length === 0) {
        return { created: 0, errors: [{ row: 0, message: "No data rows in CSV (need header row + at least one row)." }] };
      }

      const [categories, locations] = await Promise.all([
        ctx.prisma.category.findMany({ where: { userId } }),
        ctx.prisma.location.findMany({ where: { userId } }),
      ]);
      const categoryById = new Map(categories.map((c) => [c.id, c]));
      const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c]));
      const locationById = new Map(locations.map((l) => [l.id, l]));
      const locationByName = new Map(locations.map((l) => [l.name.toLowerCase().trim(), l]));

      const errors: { row: number; message: string }[] = [];
      let created = 0;

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r]!;
        const rowNum = r + 1;

        const name = (row.name ?? "").trim();
        const unit = (row.unit ?? "").trim();
        if (!name) {
          errors.push({ row: rowNum, message: "Missing name." });
          continue;
        }
        if (!unit) {
          errors.push({ row: rowNum, message: "Missing unit." });
          continue;
        }

        let categoryId = (row.categoryId ?? "").trim() || null;
        if (!categoryId && (row.category ?? "").trim()) {
          const cat = categoryByName.get((row.category ?? "").toLowerCase().trim());
          categoryId = cat?.id ?? null;
        }
        if (!categoryId) {
          errors.push({ row: rowNum, message: "Category required (use category column with exact name or categoryId)." });
          continue;
        }
        if (!categoryById.has(categoryId)) {
          errors.push({ row: rowNum, message: "Category not found for this user." });
          continue;
        }

        let locationId = (row.locationId ?? "").trim() || null;
        if (!locationId && (row.location ?? "").trim()) {
          const loc = locationByName.get((row.location ?? "").toLowerCase().trim());
          locationId = loc?.id ?? null;
        }
        if (!locationId) {
          errors.push({ row: rowNum, message: "Location required (use location column with exact name or locationId)." });
          continue;
        }
        if (!locationById.has(locationId)) {
          errors.push({ row: rowNum, message: "Location not found for this user." });
          continue;
        }

        const num = (v: string) => (v === "" ? undefined : Number(v));
        const qty = num(row.quantity);
        const minQty = num(row.minQuantity);
        const targetQty = num(row.targetQuantity);
        const calories = num(row.caloriesPerUnit);
        const date = (v: string) => {
          const s = (v ?? "").trim();
          if (!s) return undefined;
          const d = new Date(s);
          return isNaN(d.getTime()) ? undefined : d;
        };

        try {
          const item = await ctx.prisma.item.create({
            data: {
              userId,
              name,
              description: (row.description ?? "").trim() || undefined,
              quantity: qty !== undefined && !Number.isNaN(qty) ? qty : 0,
              unit: unit || "pieces",
              categoryId,
              locationId,
              expirationDate: date(row.expirationDate) ?? undefined,
              maintenanceInterval: num(row.maintenanceInterval) ?? undefined,
              lastMaintenanceDate: date(row.lastMaintenanceDate) ?? undefined,
              rotationSchedule: num(row.rotationSchedule) ?? undefined,
              lastRotationDate: date(row.lastRotationDate) ?? undefined,
              notes: (row.notes ?? "").trim() || undefined,
              imageUrl: (row.imageUrl ?? "").trim() || undefined,
              qrCode: (row.qrCode ?? "").trim() || undefined,
              minQuantity: minQty !== undefined && !Number.isNaN(minQty) ? minQty : 0,
              targetQuantity: targetQty !== undefined && !Number.isNaN(targetQty) ? targetQty : 0,
              caloriesPerUnit: calories !== undefined && !Number.isNaN(calories) ? calories : undefined,
            },
            include: { category: true, location: true },
          });
          await syncItemEvents(ctx.prisma, userId, item);
          created++;
        } catch (e) {
          errors.push({ row: rowNum, message: e instanceof Error ? e.message : "Failed to create item." });
        }
      }

      return { created, errors };
    }),
});

