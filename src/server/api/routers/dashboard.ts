import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    // Get all items
    const items = await ctx.prisma.item.findMany({
      where: { userId },
      include: { category: true },
    });

    // Calculate total water (assuming water category or items with "gallon" unit)
    const waterItems = items.filter(
      (item) =>
        item.category.name.toLowerCase().includes("water") ||
        item.unit.toLowerCase().includes("gallon") ||
        item.unit.toLowerCase().includes("liter")
    );
    const totalWater = waterItems.reduce((sum, item) => {
      // Convert to gallons if needed
      if (item.unit.toLowerCase().includes("liter")) {
        return sum + item.quantity * 0.264172;
      }
      return sum + item.quantity;
    }, 0);

    // Calculate food days (simplified - assumes average consumption)
    const foodItems = items.filter((item) =>
      item.category.name.toLowerCase().includes("food")
    );
    // This is a placeholder calculation - adjust based on your needs
    const totalFoodDays = foodItems.reduce((sum, item) => sum + item.quantity, 0) / 3; // Rough estimate

    // Calculate ammo counts
    const ammoItems = items.filter((item) =>
      item.category.name.toLowerCase().includes("ammo")
    );
    const totalAmmo = ammoItems.reduce((sum, item) => sum + item.quantity, 0);

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

    // Calculate category progress
    const categoriesWithItems = await ctx.prisma.category.findMany({
      where: { userId },
      include: {
        items: true,
      },
    });

    const categoryStats = categoriesWithItems
      .map((cat) => {
        const currentQuantity = cat.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

        // Calculate target: prefer category target, otherwise sum item targets
        let targetQuantity = cat.targetQuantity;
        if (!targetQuantity || targetQuantity === 0) {
          targetQuantity = cat.items.reduce(
            (sum, item) => sum + (item.targetQuantity || 0),
            0
          );
        }

        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          currentQuantity,
          targetQuantity: targetQuantity || 0,
          progress: targetQuantity
            ? Math.min((currentQuantity / targetQuantity) * 100, 100)
            : 0,
        };
      })
      .filter((stat) => stat.targetQuantity > 0);

    return {
      totalWater,
      totalFoodDays: Math.round(totalFoodDays),
      totalAmmo,
      upcomingExpirations,
      needsMaintenance,
      upcomingEvents,
      totalItems: items.length,
      categoryStats,
    };
  }),
});

