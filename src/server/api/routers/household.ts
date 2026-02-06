import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/** Mifflin-St Jeor equation: BMR (basal metabolic rate) in kcal/day */
function bmr(weightKg: number, heightCm: number, age: number, sex: string): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const b = sex.toLowerCase() === "female" ? base - 161 : base + 5;
  return Math.max(0, Math.round(b));
}

const ACTIVITY_CALORIE_FACTOR: Record<string, number> = {
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const householdRouter = createTRPCRouter({
  getActivityLevel: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { activityLevel: true },
    });
    return { activityLevel: user?.activityLevel ?? null };
  }),

  setActivityLevel: protectedProcedure
    .input(
      z.object({
        activityLevel: z.enum(["moderate", "very_active", "extra_active"]).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: { activityLevel: input.activityLevel },
      });
      return { activityLevel: input.activityLevel };
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const [members, user] = await Promise.all([
      ctx.prisma.familyMember.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "asc" },
      }),
      ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { activityLevel: true },
      }),
    ]);
    const factor = user?.activityLevel ? (ACTIVITY_CALORIE_FACTOR[user.activityLevel] ?? 1) : 1;
    return members.map((m) => {
      const bmrVal = bmr(m.weightKg, m.heightCm, m.age, m.sex);
      return {
        ...m,
        dailyCalories: Math.round(bmrVal * factor),
      };
    });
  }),

  getTotalDailyCalories: protectedProcedure.query(async ({ ctx }) => {
    const [members, user] = await Promise.all([
      ctx.prisma.familyMember.findMany({ where: { userId: ctx.userId } }),
      ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { activityLevel: true },
      }),
    ]);
    const factor = user?.activityLevel ? (ACTIVITY_CALORIE_FACTOR[user.activityLevel] ?? 1) : 1;
    const total = members.reduce(
      (sum, m) => sum + bmr(m.weightKg, m.heightCm, m.age, m.sex) * factor,
      0
    );
    return { totalDailyCalories: Math.round(total) };
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
