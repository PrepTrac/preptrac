import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { syncItemEvents } from "~/server/syncItemEvents";

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
        userId: ctx.session.user.id,
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
            userId: ctx.session.user.id,
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
            userId: ctx.session.user.id,
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
          userId: ctx.session.user.id,
        },
        include: {
          category: true,
          location: true,
        },
      });
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.item.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
        include: {
          category: true,
          location: true,
        },
      });

      await syncItemEvents(ctx.prisma, ctx.session.user.id, item);
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

      await syncItemEvents(ctx.prisma, ctx.session.user.id, item);
      return item;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.item.delete({
        where: { id: input.id },
      });
    }),
});

