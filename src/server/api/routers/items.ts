import { z } from "zod";
import { type Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { syncItemEvents, syncItemEventsBulk } from "~/server/syncItemEvents";
import { parseCSV } from "~/utils/csv";

export const itemsRouter = createTRPCRouter({
  /** Lightweight list for dropdowns (id, name, unit, quantity, category name). */
  getList: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.item.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        name: true,
        unit: true,
        quantity: true,
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

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
        .strict()
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.ItemWhereInput = {
        userId: ctx.userId,
      };

      if (input?.categoryId) {
        where.categoryId = input.categoryId;
      }

      if (input?.locationId) {
        where.locationId = input.locationId;
      }

      if (input?.search) {
        // SQLite does not support mode: "insensitive"; use contains only (case-sensitive)
        where.OR = [
          { name: { contains: input.search } },
          { description: { contains: input.search } },
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

      let lowInventoryIds: string[] | undefined;
      let needsMaintenanceIds: string[] | undefined;

      if (input?.lowInventory) {
        const [lowWithThreshold, lowDefault] = await Promise.all([
          ctx.prisma.$queryRaw<[{ id: string }]>`
            SELECT id FROM Item WHERE userId = ${ctx.userId} AND minQuantity > 0 AND quantity <= minQuantity
          `,
          ctx.prisma.item.findMany({
            where: {
              userId: ctx.userId,
              minQuantity: 0,
              quantity: { lte: 10 },
            },
            select: { id: true },
          }),
        ]);
        lowInventoryIds = [
          ...lowWithThreshold.map((r) => r.id),
          ...lowDefault.map((r) => r.id),
        ];
      }

      if (input?.needsMaintenance) {
        const rows = await ctx.prisma.$queryRaw<[{ id: string }]>`
          SELECT id FROM Item
          WHERE userId = ${ctx.userId}
            AND maintenanceInterval IS NOT NULL
            AND lastMaintenanceDate IS NOT NULL
            AND datetime(lastMaintenanceDate, '+' || maintenanceInterval || ' days') <= datetime('now')
        `;
        needsMaintenanceIds = rows.map((r) => r.id);
      }

      if (lowInventoryIds !== undefined || needsMaintenanceIds !== undefined) {
        const itemIds: string[] =
          lowInventoryIds !== undefined && needsMaintenanceIds !== undefined
            ? lowInventoryIds.filter((id) => new Set(needsMaintenanceIds).has(id))
            : (lowInventoryIds ?? needsMaintenanceIds ?? []);
        where.id = itemIds.length > 0 ? { in: itemIds } : { in: ["__none__"] };
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
    .input(z.object({ id: z.string() }).strict())
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

  /** Paginated recent activity (consumption + addition) with filters. */
  getRecentActivity: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        page: z.number().min(1).default(1),
        type: z.enum(["all", "consumption", "addition"]).default("all"),
        categoryIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const where: Prisma.ConsumptionLogWhereInput = {
        userId,
        ...(input.type !== "all" && { type: input.type }),
        ...(input.categoryIds?.length
          ? { item: { categoryId: { in: input.categoryIds } } }
          : {}),
      };
      const [logs, totalCount] = await Promise.all([
        ctx.prisma.consumptionLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
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
        }),
        ctx.prisma.consumptionLog.count({ where }),
      ]);
      return { logs, totalCount };
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
        { itemId: string; consumption: number; addition: number }[]
      >();
      const totalsByItemId = new Map<
        string,
        {
          itemId: string;
          itemName: string;
          unit: string;
          categoryId: string;
          categoryName: string;
          consumption: number;
          addition: number;
        }
      >();

      for (const log of logs) {
        const dateKey = new Date(log.createdAt).toISOString().slice(0, 10);
        const isAddition = log.type === "addition";
        if (!timeSeriesByDate.has(dateKey)) {
          timeSeriesByDate.set(dateKey, []);
        }
        const dayItems = timeSeriesByDate.get(dateKey) ?? [];
        const existing = dayItems.find((i) => i.itemId === log.itemId);
        if (existing) {
          if (isAddition) existing.addition += log.quantity;
          else existing.consumption += log.quantity;
        } else {
          dayItems.push({
            itemId: log.itemId,
            consumption: isAddition ? 0 : log.quantity,
            addition: isAddition ? log.quantity : 0,
          });
        }

        const cur = totalsByItemId.get(log.itemId);
        if (cur) {
          if (isAddition) cur.addition += log.quantity;
          else cur.consumption += log.quantity;
        } else {
          totalsByItemId.set(log.itemId, {
            itemId: log.itemId,
            itemName: log.item.name,
            unit: log.item.unit,
            categoryId: log.item.categoryId,
            categoryName: log.item.category.name,
            consumption: isAddition ? 0 : log.quantity,
            addition: isAddition ? log.quantity : 0,
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
    .input(z.object({ id: z.string() }).strict())
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

  /** Record activity (consumption or addition) for multiple items in one go. */
  consumeMany: protectedProcedure
    .input(
      z.object({
        activityType: z.enum(["consumption", "addition"]).default("consumption"),
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
      const isAddition = input.activityType === "addition";
      const results: { itemId: string; success: boolean; error?: string }[] = [];
      const updates: Prisma.PrismaPromise<unknown>[] = [];
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
        if (!isAddition && entry.quantity > item.quantity) {
          results.push({
            itemId: entry.itemId,
            success: false,
            error: `Not enough quantity. Available: ${item.quantity} ${item.unit}`,
          });
          continue;
        }
        results.push({ itemId: entry.itemId, success: true });
        const newQuantity = isAddition
          ? item.quantity + entry.quantity
          : item.quantity - entry.quantity;
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
              type: input.activityType,
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
      const createdItems: {
        id: string;
        name: string;
        expirationDate: Date | null;
        maintenanceInterval: number | null;
        lastMaintenanceDate: Date | null;
        rotationSchedule: number | null;
        lastRotationDate: Date | null;
      }[] = [];

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;
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
          errors.push({ row: rowNum, message: "Category required (use category column with exact name from Settings)." });
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
          errors.push({ row: rowNum, message: "Location required (use location column with exact name from Settings)." });
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
          createdItems.push({
            id: item.id,
            name: item.name,
            expirationDate: item.expirationDate,
            maintenanceInterval: item.maintenanceInterval,
            lastMaintenanceDate: item.lastMaintenanceDate,
            rotationSchedule: item.rotationSchedule,
            lastRotationDate: item.lastRotationDate,
          });
          created++;
        } catch (e) {
          errors.push({ row: rowNum, message: e instanceof Error ? e.message : "Failed to create item." });
        }
      }

      if (createdItems.length > 0) {
        await syncItemEventsBulk(ctx.prisma, userId, createdItems);
      }

      return { created, errors };
    }),
});

