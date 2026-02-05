import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/** Mifflin-St Jeor equation: BMR (basal metabolic rate) in kcal/day */
function dailyCaloriesNeeded(weightKg: number, heightCm: number, age: number, sex: string): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex.toLowerCase() === "female" ? base - 161 : base + 5;
  return Math.max(0, Math.round(bmr));
}

export const householdRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const members = await ctx.prisma.familyMember.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "asc" },
    });
    return members.map((m) => ({
      ...m,
      dailyCalories: dailyCaloriesNeeded(m.weightKg, m.heightCm, m.age, m.sex),
    }));
  }),

  getTotalDailyCalories: protectedProcedure.query(async ({ ctx }) => {
    const members = await ctx.prisma.familyMember.findMany({
      where: { userId: ctx.userId },
    });
    const total = members.reduce(
      (sum, m) => sum + dailyCaloriesNeeded(m.weightKg, m.heightCm, m.age, m.sex),
      0
    );
    return { totalDailyCalories: total };
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        age: z.number().int().min(0).max(120),
        weightKg: z.number().positive(),
        heightCm: z.number().positive(),
        sex: z.enum(["male", "female"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.familyMember.create({
        data: {
          userId: ctx.userId,
          name: input.name ?? null,
          age: input.age,
          weightKg: input.weightKg,
          heightCm: input.heightCm,
          sex: input.sex,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().nullable().optional(),
        age: z.number().int().min(0).max(120).optional(),
        weightKg: z.number().positive().optional(),
        heightCm: z.number().positive().optional(),
        sex: z.enum(["male", "female"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.familyMember.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.familyMember.delete({
        where: { id: input.id },
      });
    }),
});
