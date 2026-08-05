import { prisma } from "~/server/db";

const DEFAULT_USER_EMAIL = "default@preptrac.local";
// Authentication is intentionally disabled: PrepTrac is single-user/self-hosted.
// The legacy User.password column is kept (NOT NULL) but no longer holds a usable
// credential. New default users get an empty placeholder instead of a hashed secret.

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

const DEFAULT_LOCATIONS = [
  { name: "Home", description: "Primary residence" },
  { name: "Vehicle 1", description: "Primary vehicle" },
  { name: "Vehicle 2", description: "Secondary vehicle" },
  { name: "Cabin", description: "Vacation/retreat property" },
  { name: "Bug-out Bag", description: "Emergency go bag" },
];

/** Get the single default user, creating with default categories/locations if none exists. */
export async function getOrCreateDefaultUser(): Promise<{ id: string }> {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    create: {
      email: DEFAULT_USER_EMAIL,
      // Vestigial column; auth is disabled. Empty placeholder (not a real credential).
      password: "",
      name: "Default User",
    },
    update: {},
    select: { id: true },
  });

  // Seed default categories/locations only if this user has none (e.g. just created or fresh DB)
  const categoryCount = await prisma.category.count({ where: { userId: user.id } });
  if (categoryCount === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({ ...category, userId: user.id })),
    });
    await prisma.location.createMany({
      data: DEFAULT_LOCATIONS.map((location) => ({ ...location, userId: user.id })),
    });
  }

  return user;
}

