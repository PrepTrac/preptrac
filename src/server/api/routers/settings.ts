import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { seedDemoData } from "~/server/seedData";

const goalsInputSchema = z.object({
  ammoGoalRounds: z.number().min(0).optional().nullable(),
  waterGoalGallons: z.number().min(0).optional().nullable(),
  foodGoalDays: z.number().min(0).optional().nullable(),
  fuelGoalGallons: z.number().min(0).optional().nullable(),
  fuelGoalKwh: z.number().min(0).optional().nullable(),
  fuelGoalBatteryKwh: z.number().min(0).optional().nullable(),
});

export const settingsRouter = createTRPCRouter({
  getGoals: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        ammoGoalRounds: true,
        waterGoalGallons: true,
        foodGoalDays: true,
        fuelGoalGallons: true,
        fuelGoalKwh: true,
        fuelGoalBatteryKwh: true,
      },
    });
    return {
      ammoGoalRounds: user?.ammoGoalRounds ?? null,
      waterGoalGallons: user?.waterGoalGallons ?? null,
      foodGoalDays: user?.foodGoalDays ?? null,
      fuelGoalGallons: user?.fuelGoalGallons ?? null,
      fuelGoalKwh: user?.fuelGoalKwh ?? null,
      fuelGoalBatteryKwh: user?.fuelGoalBatteryKwh ?? null,
    };
  }),

  updateGoals: protectedProcedure
    .input(goalsInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: {
          ...(input.ammoGoalRounds !== undefined && { ammoGoalRounds: input.ammoGoalRounds }),
          ...(input.waterGoalGallons !== undefined && { waterGoalGallons: input.waterGoalGallons }),
          ...(input.foodGoalDays !== undefined && { foodGoalDays: input.foodGoalDays }),
          ...(input.fuelGoalGallons !== undefined && { fuelGoalGallons: input.fuelGoalGallons }),
          ...(input.fuelGoalKwh !== undefined && { fuelGoalKwh: input.fuelGoalKwh }),
          ...(input.fuelGoalBatteryKwh !== undefined && { fuelGoalBatteryKwh: input.fuelGoalBatteryKwh }),
        },
      });
      return { ok: true };
    }),

  fillTestData: protectedProcedure.mutation(async ({ ctx }) => {
    // The sample dataset lives in src/server/seedData.ts so it is shared with
    // automatic demo/seeded-mode seeding (ensureSeededOnce).
    return seedDemoData(ctx.prisma, ctx.userId);
  }),

  /** Remove only data that was created by "Fill test data". Leaves all user-created data untouched. */
  removeTestData: protectedProcedure.mutation(async ({ ctx }) => {
    const prisma = ctx.prisma;
    const userId = ctx.userId;

    const records = await prisma.testDataRecord.findMany({
      where: { userId },
      orderBy: { kind: "asc" },
    });
    if (records.length === 0) {
      return { removed: 0, message: "No test data found to remove." };
    }

    const byKind = {
      consumption_log: [] as string[],
      event: [] as string[],
      item: [] as string[],
      category: [] as string[],
      location: [] as string[],
      family_member: [] as string[],
    };
    for (const r of records) {
      const list = byKind[r.kind as keyof typeof byKind];
      if (list) list.push(r.recordId);
    }

    let removed = 0;
    // Delete in FK-safe order: consumption logs, events, items, then categories, locations, family members
    if (byKind.consumption_log.length > 0) {
      await prisma.consumptionLog.deleteMany({
        where: { userId, id: { in: byKind.consumption_log } },
      });
      removed += byKind.consumption_log.length;
    }
    if (byKind.event.length > 0) {
      await prisma.event.deleteMany({
        where: { userId, id: { in: byKind.event } },
      });
      removed += byKind.event.length;
    }
    if (byKind.item.length > 0) {
      await prisma.item.deleteMany({
        where: { userId, id: { in: byKind.item } },
      });
      removed += byKind.item.length;
    }
    if (byKind.category.length > 0) {
      await prisma.category.deleteMany({
        where: { userId, id: { in: byKind.category } },
      });
      removed += byKind.category.length;
    }
    if (byKind.location.length > 0) {
      await prisma.location.deleteMany({
        where: { userId, id: { in: byKind.location } },
      });
      removed += byKind.location.length;
    }
    if (byKind.family_member.length > 0) {
      await prisma.familyMember.deleteMany({
        where: { userId, id: { in: byKind.family_member } },
      });
      removed += byKind.family_member.length;
    }

    await prisma.testDataRecord.deleteMany({ where: { userId } });

    return {
      removed,
      message: `Removed ${removed} test data record(s). Your real data was not modified.`,
    };
  }),

  /** Count test data records so the UI can show "Remove test data" only when there is something to remove. */
  hasTestData: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.testDataRecord.count({
      where: { userId: ctx.userId },
    });
    return { hasTestData: count > 0, count };
  }),
});
