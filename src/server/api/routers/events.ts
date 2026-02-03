import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const eventsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          type: z.enum(["expiration", "maintenance", "rotation", "battery_replacement"]).optional(),
          completed: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.session.user.id,
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
          userId: ctx.session.user.id,
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
        date: z.date(),
        itemId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.event.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
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
        date: z.date().optional(),
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
});

