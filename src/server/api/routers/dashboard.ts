import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  resolveCategoryKind,
  EXPIRING_SOON_DAYS,
  DAY_MS,
} from "~/utils/inventory";
import {
  bmr,
  calorieFactorFor,
  waterOzPerLbFor,
  LB_PER_KG,
  FL_OZ_PER_GALLON,
} from "~/utils/household";

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    // Single fetch of every item with its category kind/name, then bucket by the
    // canonical kind. This replaces the previous per-kind name-substring queries
    // (category: { name: { contains: "Water" } }, …) so classification is owned
    // by `resolveCategoryKind` and can no longer drift between the queries and the
    // category-progress mapping below.
    const [typedItems, totalItemsCount, familyMembers, user] = await Promise.all([
      ctx.prisma.item.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
          caloriesPerUnit: true,
          category: { select: { name: true, kind: true } },
        },
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

    const waterItems = typedItems.filter(
      (item) => resolveCategoryKind(item.category) === "water",
    );
    const foodItems = typedItems.filter(
      (item) => resolveCategoryKind(item.category) === "food",
    );
    const ammoItems = typedItems.filter(
      (item) => resolveCategoryKind(item.category) === "ammo",
    );
    const fuelItems = typedItems.filter(
      (item) => resolveCategoryKind(item.category) === "fuel",
    );
    const activityLevel = user?.activityLevel ?? null;
    const calorieFactor = calorieFactorFor(activityLevel);
    const waterOzPerLb = waterOzPerLbFor(activityLevel);

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
    const totalWeightLbs = familyMembers.reduce((sum, m) => sum + m.weightKg * LB_PER_KG, 0);
    const dailyWaterOz = totalWeightLbs * waterOzPerLb;
    const dailyWaterGallons = dailyWaterOz / FL_OZ_PER_GALLON;
    const totalWaterDays =
      dailyWaterGallons > 0 && totalWater > 0 ? totalWater / dailyWaterGallons : undefined;
    const useHouseholdForWater = totalWeightLbs > 0 && totalWaterDays != null;

    // Total inventory calories: sum over items that have caloriesPerUnit set
    const totalInventoryCalories = typedItems.reduce(
      (sum, item) =>
        item.caloriesPerUnit != null && item.caloriesPerUnit > 0
          ? sum + item.quantity * item.caloriesPerUnit
          : sum,
      0
    );

    // Household total daily calories (Mifflin-St Jeor BMR × activity factor)
    const getTotalDailyCalories = () => {
      const bmrSum = familyMembers.reduce(
        (sum, m) => sum + bmr(m.weightKg, m.heightCm, m.age, m.sex),
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
    const now = new Date();
    const expiringSoonHorizon = new Date(now.getTime() + EXPIRING_SOON_DAYS * DAY_MS);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const [upcomingExpirations, allItemsWithMaintenance, upcomingEvents, categoriesWithItems] =
      await Promise.all([
        ctx.prisma.item.findMany({
          where: {
            userId,
            expirationDate: {
              lte: expiringSoonHorizon,
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

    const catKind = (cat: { kind?: string | null; name: string }) =>
      resolveCategoryKind(cat);

    const categoryStats = categoriesWithItems
      .map((cat) => {
        const kind = catKind(cat);
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

        if (kind === "ammo" && user?.ammoGoalRounds != null && user.ammoGoalRounds > 0) {
          currentQuantity = cat.items.reduce((sum, item) => sum + item.quantity, 0);
          targetQuantity = user.ammoGoalRounds;
        } else if (kind === "water" && user?.waterGoalGallons != null && user.waterGoalGallons > 0) {
          currentQuantity = cat.items
            .filter((item) => isGallon(item.unit) || isBottle(item.unit))
            .reduce((sum, item) => {
              if (isBottle(item.unit)) return sum + item.quantity * GALLONS_PER_BOTTLE;
              return sum + item.quantity;
            }, 0);
          targetQuantity = user.waterGoalGallons;
        } else if (kind === "food" && user?.foodGoalDays != null && user.foodGoalDays > 0) {
          const totalFoodCalories = cat.items.reduce((sum, item) => {
            const cal = (item as { caloriesPerUnit?: number | null }).caloriesPerUnit;
            if (cal != null && cal > 0) return sum + item.quantity * cal;
            return sum;
          }, 0);
          currentQuantity = totalDailyCalories > 0 ? totalFoodCalories / totalDailyCalories : 0;
          targetQuantity = user.foodGoalDays;
        } else if (kind === "fuel") {
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
          kind === "ammo" && user?.ammoGoalRounds != null && user.ammoGoalRounds > 0
            ? "rounds"
            : kind === "water" && user?.waterGoalGallons != null && user.waterGoalGallons > 0
              ? "gallons"
              : kind === "food" && user?.foodGoalDays != null && user.foodGoalDays > 0
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

