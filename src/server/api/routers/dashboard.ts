import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/** Activity level multipliers for calories (BMR × factor) and water (oz per lb body weight). */
const ACTIVITY_CALORIE_FACTOR: Record<string, number> = {
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};
const ACTIVITY_WATER_OZ_PER_LB: Record<string, number> = {
  moderate: 0.65,
  very_active: 0.75,
  extra_active: 0.85,
};
const DEFAULT_WATER_OZ_PER_LB = 0.5;

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    // Get all items, household, and user activity level
    const [items, familyMembers, user] = await Promise.all([
      ctx.prisma.item.findMany({
        where: { userId },
        include: { category: true },
      }),
      ctx.prisma.familyMember.findMany({ where: { userId } }),
      ctx.prisma.user.findUnique({
        where: { id: userId },
        select: {
          activityLevel: true,
          ammoGoalRounds: true,
          waterGoalGallons: true,
          foodGoalDays: true,
          fuelGoalGallons: true,
        },
      }),
    ]);
    const activityLevel = user?.activityLevel ?? null;
    const calorieFactor = activityLevel ? (ACTIVITY_CALORIE_FACTOR[activityLevel] ?? 1) : 1;
    const waterOzPerLb = activityLevel ? (ACTIVITY_WATER_OZ_PER_LB[activityLevel] ?? DEFAULT_WATER_OZ_PER_LB) : DEFAULT_WATER_OZ_PER_LB;

    // Water: only count items in water category with unit "gallon(s)" or "bottle(s)"
    // Bottles = 16.9 fl oz standard; 1 gallon = 128 fl oz → 1 bottle = 16.9/128 gal
    const GALLONS_PER_BOTTLE = 16.9 / 128;
    const isGallon = (u: string) => /gallon(s)?/i.test(u);
    const isBottle = (u: string) => /bottle(s)?/i.test(u);
    const waterItems = items.filter(
      (item) =>
        item.category.name.toLowerCase().includes("water") &&
        (isGallon(item.unit) || isBottle(item.unit))
    );
    const totalWater = waterItems.reduce((sum, item) => {
      if (isBottle(item.unit)) {
        return sum + item.quantity * GALLONS_PER_BOTTLE;
      }
      return sum + item.quantity;
    }, 0);
    const waterBreakdown = waterItems.map((item) => {
      const gallonsEquivalent = isBottle(item.unit)
        ? item.quantity * GALLONS_PER_BOTTLE
        : item.quantity;
      return {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        gallonsEquivalent: Math.round(gallonsEquivalent * 100) / 100,
      };
    });

    // Water days: oz per lb by activity level (from household)
    const totalWeightLbs = familyMembers.reduce((sum, m) => sum + m.weightKg * 2.20462, 0);
    const dailyWaterOz = totalWeightLbs * waterOzPerLb;
    const dailyWaterGallons = dailyWaterOz / 128;
    const totalWaterDays =
      dailyWaterGallons > 0 && totalWater > 0 ? totalWater / dailyWaterGallons : undefined;
    const useHouseholdForWater = totalWeightLbs > 0 && totalWaterDays != null;

    // Total inventory calories: sum over ALL items that have caloriesPerUnit set
    const totalInventoryCalories = items.reduce((sum, item) => {
      const caloriesPerUnit = (item as { caloriesPerUnit?: number | null }).caloriesPerUnit;
      if (caloriesPerUnit != null && caloriesPerUnit > 0) {
        return sum + item.quantity * caloriesPerUnit;
      }
      return sum;
    }, 0);

    const foodItems = items.filter((item) =>
      item.category.name.toLowerCase().includes("food")
    );

    // Household total daily calories (Mifflin-St Jeor BMR × activity factor)
    const getTotalDailyCalories = () => {
      const base = (w: number, h: number, a: number, s: string) => {
        const b = 10 * w + 6.25 * h - 5 * a;
        return s.toLowerCase() === "female" ? b - 161 : b + 5;
      };
      const bmrSum = familyMembers.reduce(
        (sum, m) => sum + Math.max(0, Math.round(base(m.weightKg, m.heightCm, m.age, m.sex))),
        0
      );
      return Math.round(bmrSum * calorieFactor);
    };
    const totalDailyCalories = getTotalDailyCalories();

    // Days of food: use household-based calculation when possible
    let totalFoodDays: number;
    let useHouseholdCalculation = false;
    if (totalDailyCalories > 0 && totalInventoryCalories > 0) {
      totalFoodDays = totalInventoryCalories / totalDailyCalories;
      useHouseholdCalculation = true;
    } else {
      // Fallback: generic estimate (same as before)
      totalFoodDays = foodItems.reduce((sum, item) => sum + item.quantity, 0) / 3;
    }

    // Food breakdown by item: name, quantity, unit, optional days contribution
    const foodBreakdown = foodItems.map((item) => {
      const caloriesPerUnit = (item as { caloriesPerUnit?: number | null }).caloriesPerUnit;
      const itemCalories = caloriesPerUnit != null && caloriesPerUnit > 0 ? item.quantity * caloriesPerUnit : 0;
      const contributionDays =
        totalDailyCalories > 0 && itemCalories > 0 ? itemCalories / totalDailyCalories : undefined;
      return {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        contributionDays: contributionDays != null ? Math.round(contributionDays * 10) / 10 : undefined,
      };
    });

    // Calculate ammo counts and per-type breakdown
    const ammoItems = items.filter((item) =>
      item.category.name.toLowerCase().includes("ammo")
    );
    const totalAmmo = ammoItems.reduce((sum, item) => sum + item.quantity, 0);
    const ammoBreakdown = ammoItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    }));

    // Get upcoming expirations (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const upcomingExpirations = await ctx.prisma.item.findMany({
      where: {
        userId,
        expirationDate: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
      },
      include: { category: true, location: true },
      orderBy: { expirationDate: "asc" },
      take: 10,
    });

    // Get items needing maintenance
    const allItemsWithMaintenance = await ctx.prisma.item.findMany({
      where: {
        userId,
        maintenanceInterval: { not: null },
      },
    });

    const now = new Date();
    const needsMaintenance = allItemsWithMaintenance
      .filter((item) => {
        if (!item.maintenanceInterval || !item.lastMaintenanceDate) return false;
        const nextMaintenance = new Date(item.lastMaintenanceDate);
        nextMaintenance.setDate(nextMaintenance.getDate() + item.maintenanceInterval);
        return nextMaintenance <= now;
      })
      .slice(0, 10)
      .map((item) => ({
        ...item,
        nextMaintenanceDate: item.lastMaintenanceDate
          ? new Date(
              item.lastMaintenanceDate.getTime() +
                item.maintenanceInterval! * 24 * 60 * 60 * 1000
            )
          : null,
      }));

    // Get upcoming events (next 3 months)
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const upcomingEvents = await ctx.prisma.event.findMany({
      where: {
        userId,
        date: {
          lte: threeMonthsFromNow,
          gte: new Date(),
        },
        completed: false,
      },
      include: {
        item: {
          include: {
            category: true,
            location: true,
          },
        },
      },
      orderBy: { date: "asc" },
      take: 20,
    });

    // Calculate category progress (goals from Settings take precedence when set)
    const categoriesWithItems = await ctx.prisma.category.findMany({
      where: { userId },
      include: {
        items: true,
      },
    });

    const catNameLower = (name: string) => name.toLowerCase();
    const isAmmoCat = (name: string) => catNameLower(name).includes("ammo");
    const isWaterCat = (name: string) => catNameLower(name).includes("water");
    const isFoodCat = (name: string) => catNameLower(name).includes("food");
    const isFuelCat = (name: string) =>
      catNameLower(name).includes("fuel") || catNameLower(name).includes("energy");

    const categoryStats = categoriesWithItems
      .map((cat) => {
        let currentQuantity: number;
        let targetQuantity: number;

        if (isAmmoCat(cat.name) && user?.ammoGoalRounds != null && user.ammoGoalRounds > 0) {
          currentQuantity = cat.items.reduce((sum, item) => sum + item.quantity, 0);
          targetQuantity = user.ammoGoalRounds;
        } else if (isWaterCat(cat.name) && user?.waterGoalGallons != null && user.waterGoalGallons > 0) {
          currentQuantity = cat.items
            .filter((item) => isGallon(item.unit) || isBottle(item.unit))
            .reduce((sum, item) => {
              if (isBottle(item.unit)) return sum + item.quantity * GALLONS_PER_BOTTLE;
              return sum + item.quantity;
            }, 0);
          targetQuantity = user.waterGoalGallons;
        } else if (isFoodCat(cat.name) && user?.foodGoalDays != null && user.foodGoalDays > 0 && totalDailyCalories > 0) {
          const totalFoodCalories = cat.items.reduce((sum, item) => {
            const cal = (item as { caloriesPerUnit?: number | null }).caloriesPerUnit;
            if (cal != null && cal > 0) return sum + item.quantity * cal;
            return sum;
          }, 0);
          currentQuantity = totalFoodCalories / totalDailyCalories;
          targetQuantity = user.foodGoalDays;
        } else if (isFuelCat(cat.name) && user?.fuelGoalGallons != null && user.fuelGoalGallons > 0) {
          currentQuantity = cat.items
            .filter((item) => isGallon(item.unit))
            .reduce((sum, item) => sum + item.quantity, 0);
          targetQuantity = user.fuelGoalGallons;
        } else {
          currentQuantity = cat.items.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          targetQuantity = cat.targetQuantity ?? 0;
          if (!targetQuantity || targetQuantity === 0) {
            targetQuantity = cat.items.reduce(
              (sum, item) => sum + (item.targetQuantity || 0),
              0
            );
          }
        }

        const displayUnit =
          isFoodCat(cat.name) && user?.foodGoalDays != null && user.foodGoalDays > 0 ? "days" : undefined;
        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          currentQuantity,
          targetQuantity: targetQuantity || 0,
          progress: targetQuantity
            ? Math.min((currentQuantity / targetQuantity) * 100, 100)
            : 0,
          displayUnit,
        };
      })
      .filter((stat) => stat.targetQuantity > 0);

    return {
      totalWater: Math.round(totalWater * 100) / 100,
      waterBreakdown,
      totalWaterDays:
        totalWaterDays != null ? Math.round(totalWaterDays * 10) / 10 : undefined,
      useHouseholdForWater: !!useHouseholdForWater,
      totalFoodDays: Math.round(totalFoodDays * 10) / 10,
      totalInventoryCalories: Math.round(totalInventoryCalories),
      householdDailyCalories: totalDailyCalories,
      useHouseholdCalculation,
      totalAmmo,
      ammoBreakdown,
      foodBreakdown,
      upcomingExpirations,
      needsMaintenance,
      upcomingEvents,
      totalItems: items.length,
      categoryStats,
    };
  }),
});

