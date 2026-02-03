import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import bcrypt from "bcryptjs";

// Default categories for new users
const DEFAULT_CATEGORIES = [
  { name: "Food", description: "Canned goods, MREs, dried food, etc.", color: "#F59E0B", icon: "utensils" },
  { name: "Water", description: "Water storage, purification, containers", color: "#3B82F6", icon: "droplet" },
  { name: "Ammo", description: "Ammunition and reloading supplies", color: "#EF4444", icon: "crosshair" },
  { name: "Medical", description: "First aid, medications, medical supplies", color: "#10B981", icon: "cross" },
  { name: "Tools", description: "Knives, multi-tools, equipment", color: "#6B7280", icon: "wrench" },
  { name: "Clothing", description: "Survival gear, boots, clothing", color: "#8B5CF6", icon: "shirt" },
  { name: "Shelter", description: "Tents, tarps, sleeping bags", color: "#EC4899", icon: "home" },
  { name: "Fuel & Energy", description: "Gasoline, batteries, solar panels", color: "#F97316", icon: "zap" },
  { name: "Communication", description: "Radios, phones, signaling", color: "#06B6D4", icon: "radio" },
  { name: "Defense", description: "Self-defense items, security", color: "#DC2626", icon: "shield" },
];

// Default locations for new users
const DEFAULT_LOCATIONS = [
  { name: "Home", description: "Primary residence" },
  { name: "Vehicle 1", description: "Primary vehicle" },
  { name: "Vehicle 2", description: "Secondary vehicle" },
  { name: "Cabin", description: "Vacation/retreat property" },
  { name: "Bug-out Bag", description: "Emergency go bag" },
];

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hashedPassword = await bcrypt.hash(input.password, 10);

      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.name,
        },
      });

      // Create default categories for the new user
      await ctx.prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((category) => ({
          ...category,
          userId: user.id,
        })),
      });

      // Create default locations for the new user
      await ctx.prisma.location.createMany({
        data: DEFAULT_LOCATIONS.map((location) => ({
          ...location,
          userId: user.id,
        })),
      });

      return { success: true, userId: user.id };
    }),
});

