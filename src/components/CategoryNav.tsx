"use client";

import type { RouterOutputs } from "~/utils/api";

type Category = RouterOutputs["categories"]["getAll"][0];

interface CategoryNavProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory: (categoryId: string | undefined) => void;
}

export default function CategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryNavProps) {
  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <label htmlFor="inventory-category-filter" className="text-sm font-medium text-ink">
        Category:
      </label>
      <select
        id="inventory-category-filter"
        value={selectedCategory || ""}
        onChange={(e) => onSelectCategory(e.target.value || undefined)}
        className="min-w-0 max-w-48 px-3 py-2 rounded-[3px] text-sm font-medium border border-line bg-raised text-ink hover:bg-paper dark:hover:bg-surface cursor-pointer"
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {selectedCategoryData && selectedCategoryData.color && (
        <div
          className="w-4 h-4 rounded"
          style={{ backgroundColor: selectedCategoryData.color }}
          title={selectedCategoryData.name}
        />
      )}
    </div>
  );
}

