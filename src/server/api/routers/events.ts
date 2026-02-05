import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { syncItemEvents } from "~/server/syncItemEvents";

export const eventsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
          endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
          type: z.enum(["expiration", "maintenance", "rotation", "battery_replacement"]).optional(),
          completed: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.userId,
      };

      if (input?.startDate || input?.endDate) {
        where.date = {};
        if (input.startDate) where.date.gte = input.startDate;
        if (input.endDate) where.date.lte = input.endDate;
      }

      if (input?.type) {
        where.type = input.type;
      }

      if (input?.completed !== undefined) {
        where.completed = input.completed;
      }

      return ctx.prisma.event.findMany({
        where,
        include: {
          item: {
            include: {
              category: true,
              location: true,
            },
          },
        },
        orderBy: { date: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.event.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          item: {
            include: {
              category: true,
              location: true,
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["expiration", "maintenance", "rotation", "battery_replacement"]),
        title: z.string().min(1),
        description: z.string().optional(),
        date: z.string().transform((val) => new Date(val)),
        itemId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.event.create({
        data: {
          ...input,
          userId: ctx.userId,
        },
        include: {
          item: {
            include: {
              category: true,
              location: true,
            },
          },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.enum(["expiration", "maintenance", "rotation", "battery_replacement"]).optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        date: z.string().optional().transform((val) => val ? new Date(val) : undefined),
        itemId: z.string().nullable().optional(),
        completed: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, completed, ...data } = input;
      
      // Build update data with proper typing
      const updateData: {
        type?: "expiration" | "maintenance" | "rotation" | "battery_replacement";
        title?: string;
        description?: string;
        date?: Date;
        itemId?: string | null;
        completed?: boolean;
        completedAt?: Date | null;
      } = { ...data };
      
      // Set completedAt when marking as completed
      if (completed === true) {
        updateData.completed = true;
        updateData.completedAt = new Date();
      } else if (completed === false) {
        updateData.completed = false;
        updateData.completedAt = null;
      }
      
      return ctx.prisma.event.update({
        where: { id },
        data: updateData,
        include: {
          item: {
            include: {
              category: true,
              location: true,
            },
          },
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.event.delete({
        where: { id: input.id },
      });
    }),

  markComplete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.event.update({
        where: { id: input.id },
        data: {
          completed: true,
          completedAt: new Date(),
        },
      });
    }),

  /** Sync calendar events from all items (expiration, maintenance, rotation). Call to backfill existing items. */
  syncFromItems: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.userId;
    const items = await ctx.prisma.item.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        expirationDate: true,
        maintenanceInterval: true,
        lastMaintenanceDate: true,
        rotationSchedule: true,
        lastRotationDate: true,
      },
    });

    for (const item of items) {
      await syncItemEvents(ctx.prisma, userId, item);
    }

    return { synced: items.length };
  }),
});

