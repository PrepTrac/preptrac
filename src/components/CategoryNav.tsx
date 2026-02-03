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
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Category:
      </label>
      <select
        value={selectedCategory || ""}
        onChange={(e) => onSelectCategory(e.target.value || undefined)}
        className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
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

