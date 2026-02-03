import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Default categories for users
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

// Default locations for users
const DEFAULT_LOCATIONS = [
  { name: "Home", description: "Primary residence" },
  { name: "Vehicle 1", description: "Primary vehicle" },
  { name: "Vehicle 2", description: "Secondary vehicle" },
  { name: "Cabin", description: "Vacation/retreat property" },
  { name: "Bug-out Bag", description: "Emergency go bag" },
];

async function main() {
  console.log("🌱 Starting database seed...");

  // Get all users
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users`);

  for (const user of users) {
    console.log(`\nProcessing user: ${user.email}`);

    // Check if user has categories
    const existingCategories = await prisma.category.findMany({
      where: { userId: user.id },
    });

    if (existingCategories.length === 0) {
      console.log(`  Creating default categories...`);
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((category) => ({
          ...category,
          userId: user.id,
        })),
      });
      console.log(`  ✓ Created ${DEFAULT_CATEGORIES.length} categories`);
    } else {
      console.log(`  User already has ${existingCategories.length} categories`);
    }

    // Check if user has locations
    const existingLocations = await prisma.location.findMany({
      where: { userId: user.id },
    });

    if (existingLocations.length === 0) {
      console.log(`  Creating default locations...`);
      await prisma.location.createMany({
        data: DEFAULT_LOCATIONS.map((location) => ({
          ...location,
          userId: user.id,
        })),
      });
      console.log(`  ✓ Created ${DEFAULT_LOCATIONS.length} locations`);
    } else {
      console.log(`  User already has ${existingLocations.length} locations`);
    }
  }

  console.log("\n✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

