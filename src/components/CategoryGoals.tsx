"use client";

import type { RouterOutputs } from "~/utils/api";

type CategoryStat = NonNullable<RouterOutputs["dashboard"]["getStats"]["categoryStats"]>[number];

interface CategoryGoalsProps {
  categoryStats: CategoryStat[];
}

export default function CategoryGoals({ categoryStats }: CategoryGoalsProps) {
  if (!categoryStats || categoryStats.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-8">
      <div className="px-5 py-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
          Category Progress Goals
        </h3>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categoryStats.map((stat) => (
            <div key={stat.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  {stat.color && (
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: stat.color }}
                    />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {stat.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.currentQuantity.toFixed(1)} / {stat.targetQuantity.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${stat.progress}%`,
                    backgroundColor: stat.color || "#3B82F6",
                  }}
                />
              </div>
              <div className="flex justify-end">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {Math.round(stat.progress)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
