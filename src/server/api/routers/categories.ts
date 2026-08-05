import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Mirrors CATEGORY_KINDS in src/utils/inventory.ts (z.enum needs a literal tuple).
const categoryKindSchema = z.enum(["ammo", "water", "food", "fuel", "other"]);

export const categoriesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.category.findMany({
      where: { userId: ctx.userId },
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.category.findFirst({
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
        color: z.string().optional(),
        icon: z.string().optional(),
        kind: categoryKindSchema.optional(),
        targetQuantity: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.category.create({
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
        color: z.string().optional(),
        icon: z.string().optional(),
        kind: categoryKindSchema.optional(),
        targetQuantity: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // Ownership scoping: only update a category owned by this user.
      const result = await ctx.prisma.category.updateMany({
        where: { id, userId: ctx.userId },
        data,
      });
      if (result.count === 0) {
        throw new Error("Category not found");
      }
      return ctx.prisma.category.findFirstOrThrow({
        where: { id, userId: ctx.userId },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Ownership scoping: only delete a category owned by this user.
      const result = await ctx.prisma.category.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      });
      if (result.count === 0) {
        throw new Error("Category not found");
      }
      return { success: true };
    }),
});

