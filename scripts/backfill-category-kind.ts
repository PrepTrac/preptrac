/**
 * One-time, idempotent backfill of `Category.kind` from the category name.
 *
 * `Category.kind` is nullable and additive (added without a destructive
 * migration). Existing rows created before the field existed have `kind = NULL`,
 * and the app falls back to name-based inference at runtime
 * (`resolveCategoryKind` in src/utils/inventory.ts). This script populates the
 * canonical `kind` for every category so classification no longer depends on the
 * name and survives renames.
 *
 * Safe to run repeatedly: it only sets `kind` on rows where it is currently null,
 * and never overwrites an explicit kind. Run once after deploying this change:
 *
 *   npx tsx scripts/backfill-category-kind.ts
 *
 * (Add `db:backfill:kinds` to package.json scripts to run via `npm run`.)
 */
import "dotenv/config";
import { createPrismaClient } from "../src/server/prismaClient";
import { inferCategoryKindFromName } from "../src/utils/inventory";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to backfill category kinds");
const prisma = createPrismaClient(databaseUrl);

async function main() {
  const categories = await prisma.category.findMany({
    where: { kind: null },
    select: { id: true, name: true },
  });

  let updated = 0;
  for (const cat of categories) {
    const kind = inferCategoryKindFromName(cat.name);
    await prisma.category.update({
      where: { id: cat.id },
      data: { kind },
    });
    updated++;
  }

  console.log(`✓ Backfilled kind for ${updated} categor(y/ies) (of ${categories.length} with null kind).`);
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
