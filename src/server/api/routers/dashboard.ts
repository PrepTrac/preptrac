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

    // Targeted item queries and user/household (no full-item fetch)
    const [
      waterItems,
      foodItems,
      ammoItems,
      fuelItems,
      itemsWithCalories,
      totalItemsCount,
      familyMembers,
      user,
    ] = await Promise.all([
      ctx.prisma.item.findMany({
        where: {
          userId,
          category: { name: { contains: "Water" } },
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
          category: { select: { name: true } },
        },
      }),
      ctx.prisma.item.findMany({
        where: {
          userId,
          category: { name: { contains: "Food" } },
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
          caloriesPerUnit: true,
          category: { select: { name: true } },
        },
      }),
      ctx.prisma.item.findMany({
        where: {
          userId,
          category: { name: { contains: "Ammo" } },
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
          category: { select: { name: true } },
        },
      }),
      ctx.prisma.item.findMany({
        where: {
          userId,
          category: {
            OR: [
              { name: { contains: "Fuel" } },
              { name: { contains: "Energy" } },
            ],
          },
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
          category: { select: { name: true } },
        },
      }),
      ctx.prisma.item.findMany({
        where: {
          userId,
          caloriesPerUnit: { not: null },
        },
        select: { quantity: true, caloriesPerUnit: true },
      }),
      ctx.prisma.item.count({ where: { userId } }),
      ctx.prisma.familyMember.findMany({ where: { userId } }),
      ctx.prisma.user.findUnique({
        where: { id: userId },
        select: {
          activityLevel: true,
          ammoGoalRounds: true,
          waterGoalGallons: true,
          foodGoalDays: true,
          fuelGoalGallons: true,
          fuelGoalKwh: true,
          fuelGoalBatteryKwh: true,
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
    const waterItemsFiltered = waterItems.filter(
      (item) => isGallon(item.unit) || isBottle(item.unit)
    );
    const totalWater = waterItemsFiltered.reduce((sum, item) => {
      if (isBottle(item.unit)) {
        return sum + item.quantity * GALLONS_PER_BOTTLE;
      }
      return sum + item.quantity;
    }, 0);
    const waterBreakdown = waterItemsFiltered.map((item) => {
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

    // Total inventory calories: sum over items that have caloriesPerUnit set
    const totalInventoryCalories = itemsWithCalories.reduce(
      (sum, item) =>
        item.caloriesPerUnit != null && item.caloriesPerUnit > 0
          ? sum + item.quantity * item.caloriesPerUnit
          : sum,
      0
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
      totalFoodDays = foodItems.reduce((sum, item) => sum + item.quantity, 0) / 3;
    }

    // Food breakdown by item: name, quantity, unit, calories (for bar), optional days contribution
    const foodBreakdown = foodItems.map((item) => {
      const caloriesPerUnit = item.caloriesPerUnit;
      const itemCalories = caloriesPerUnit != null && caloriesPerUnit > 0 ? item.quantity * caloriesPerUnit : 0;
      const contributionDays =
        totalDailyCalories > 0 && itemCalories > 0 ? itemCalories / totalDailyCalories : undefined;
      return {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        calories: itemCalories,
        contributionDays: contributionDays != null ? Math.round(contributionDays * 10) / 10 : undefined,
      };
    });

    const totalAmmo = ammoItems.reduce((sum, item) => sum + item.quantity, 0);
    const ammoBreakdown = ammoItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    }));

    // Fuel/energy: gallons (generator fuel), kWh from battery (unit "kwh"), total kWh = 6 kWh/gal × gallons + battery kWh
    const KWH_PER_GALLON = 6;
    const isGallonUnit = (u: string) => /gallon(s)?/i.test(u);
    const isKwhUnit = (u: string) => /kwh/i.test(u);
    const totalFuelGallons = fuelItems
      .filter((item) => isGallonUnit(item.unit))
      .reduce((sum, item) => sum + item.quantity, 0);
    const batteryKwh = fuelItems
      .filter((item) => isKwhUnit(item.unit))
      .reduce((sum, item) => sum + item.quantity, 0);
    const generatorKwh = totalFuelGallons * KWH_PER_GALLON;
    const totalKwh = generatorKwh + batteryKwh;

    // Run second wave of queries in parallel
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const now = new Date();

    const [upcomingExpirations, allItemsWithMaintenance, upcomingEvents, categoriesWithItems] =
      await Promise.all([
        ctx.prisma.item.findMany({
          where: {
            userId,
            expirationDate: {
              lte: thirtyDaysFromNow,
              gte: now,
            },
          },
          include: { category: true, location: true },
          orderBy: { expirationDate: "asc" },
          take: 10,
        }),
        ctx.prisma.item.findMany({
          where: {
            userId,
            maintenanceInterval: { not: null },
          },
        }),
        ctx.prisma.event.findMany({
          where: {
            userId,
            date: {
              lte: threeMonthsFromNow,
              gte: now,
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
        }),
        ctx.prisma.category.findMany({
          where: { userId },
          include: {
            items: true,
          },
        }),
      ]);

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
        let fuelSubProgresses:
          | {
              fuelGallons?: { current: number; target: number; progress: number };
              totalKwh?: { current: number; target: number; progress: number };
              batteryKwh?: { current: number; target: number; progress: number };
            }
          | undefined;
        let fuelDisplayUnit: string | undefined;

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
        } else if (isFoodCat(cat.name) && user?.foodGoalDays != null && user.foodGoalDays > 0) {
          const totalFoodCalories = cat.items.reduce((sum, item) => {
            const cal = (item as { caloriesPerUnit?: number | null }).caloriesPerUnit;
            if (cal != null && cal > 0) return sum + item.quantity * cal;
            return sum;
          }, 0);
          currentQuantity = totalDailyCalories > 0 ? totalFoodCalories / totalDailyCalories : 0;
          targetQuantity = user.foodGoalDays;
        } else if (isFuelCat(cat.name)) {
          // Fuel/energy: per-category gallons, total kWh, battery kWh
          const catFuelGallons = cat.items
            .filter((item) => isGallonUnit(item.unit))
            .reduce((sum, item) => sum + item.quantity, 0);
          const catBatteryKwh = cat.items
            .filter((item) => isKwhUnit(item.unit))
            .reduce((sum, item) => sum + item.quantity, 0);
          const catGeneratorKwh = catFuelGallons * KWH_PER_GALLON;
          const catTotalKwh = catGeneratorKwh + catBatteryKwh;

          const fuelGoalGallons = user?.fuelGoalGallons ?? 0;
          const fuelGoalKwh = user?.fuelGoalKwh ?? 0;
          const fuelGoalBatteryKwh = user?.fuelGoalBatteryKwh ?? 0;
          const hasAnyFuelGoal = fuelGoalGallons > 0 || fuelGoalKwh > 0 || fuelGoalBatteryKwh > 0;

          if (hasAnyFuelGoal) {
            // Primary bar uses total kWh (generator + battery) when set, else gallons, else battery
            if (fuelGoalKwh > 0) {
              currentQuantity = catTotalKwh;
              targetQuantity = fuelGoalKwh;
              fuelDisplayUnit = "kWh";
            } else if (fuelGoalGallons > 0) {
              currentQuantity = catFuelGallons;
              targetQuantity = fuelGoalGallons;
              fuelDisplayUnit = "gal";
            } else {
              currentQuantity = catBatteryKwh;
              targetQuantity = fuelGoalBatteryKwh;
              fuelDisplayUnit = "kWh";
            }
            fuelSubProgresses = {};
            if (fuelGoalGallons > 0) {
              const progress = (catFuelGallons / fuelGoalGallons) * 100;
              fuelSubProgresses.fuelGallons = {
                current: Math.round(catFuelGallons * 100) / 100,
                target: fuelGoalGallons,
                progress: Math.min(progress, 100),
              };
            }
            if (fuelGoalKwh > 0) {
              const progress = (catTotalKwh / fuelGoalKwh) * 100;
              fuelSubProgresses.totalKwh = {
                current: Math.round(catTotalKwh * 10) / 10,
                target: fuelGoalKwh,
                progress: Math.min(progress, 100),
              };
            }
            if (fuelGoalBatteryKwh > 0) {
              const progress = (catBatteryKwh / fuelGoalBatteryKwh) * 100;
              fuelSubProgresses.batteryKwh = {
                current: Math.round(catBatteryKwh * 10) / 10,
                target: fuelGoalBatteryKwh,
                progress: Math.min(progress, 100),
              };
            }
          } else {
            currentQuantity = cat.items.reduce((sum, item) => sum + item.quantity, 0);
            targetQuantity = cat.targetQuantity ?? 0;
            if (!targetQuantity || targetQuantity === 0) {
              targetQuantity = cat.items.reduce(
                (sum, item) => sum + (item.targetQuantity || 0),
                0
              );
            }
          }
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
          isAmmoCat(cat.name) && user?.ammoGoalRounds != null && user.ammoGoalRounds > 0
            ? "rounds"
            : isWaterCat(cat.name) && user?.waterGoalGallons != null && user.waterGoalGallons > 0
              ? "gallons"
              : isFoodCat(cat.name) && user?.foodGoalDays != null && user.foodGoalDays > 0
                ? "days"
                : fuelDisplayUnit;
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
          ...(fuelSubProgresses && Object.keys(fuelSubProgresses).length > 0 && { fuelSubProgresses }),
        };
      })
      .filter((stat) => stat.targetQuantity > 0);

    return {
      totalWater: Math.round(totalWater * 100) / 100,
      waterBreakdown,
      totalWaterDays:
        totalWaterDays != null ? Math.round(totalWaterDays * 10) / 10 : undefined,
      useHouseholdForWater: !!useHouseholdForWater,
      totalFuelGallons: Math.round(totalFuelGallons * 100) / 100,
      totalKwh: Math.round(totalKwh * 10) / 10,
      batteryKwh: Math.round(batteryKwh * 10) / 10,
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
      totalItems: totalItemsCount,
      categoryStats,
    };
  }),
});

