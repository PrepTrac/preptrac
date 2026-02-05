import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const locationsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.location.findMany({
      where: { userId: ctx.userId },
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.location.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.location.create({
        data: {
          ...input,
          userId: ctx.userId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.location.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.location.delete({
        where: { id: input.id },
      });
    }),

  /** Consumption logs for items in this location (for location detail view). */
  getConsumptionByLocation: protectedProcedure
    .input(
      z.object({
        locationId: z.string(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.consumptionLog.findMany({
        where: {
          userId: ctx.userId,
          item: { locationId: input.locationId },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit ?? 50,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              unit: true,
              locationId: true,
            },
          },
        },
      });
    }),
});

