"use client";

import { useState } from "react";
import type { RouterOutputs } from "~/utils/api";

type CategoryStat = NonNullable<RouterOutputs["dashboard"]["getStats"]["categoryStats"]>[number];
type AmmoBreakdownItem = { name: string; quantity: number; unit: string };
type FoodBreakdownItem = { name: string; quantity: number; unit: string; contributionDays?: number };
type WaterBreakdownItem = { name: string; quantity: number; unit: string; gallonsEquivalent: number };

interface CategoryGoalsProps {
  categoryStats: CategoryStat[];
  ammoBreakdown?: AmmoBreakdownItem[];
  foodBreakdown?: FoodBreakdownItem[];
  waterBreakdown?: WaterBreakdownItem[];
}

function isAmmoCategory(name: string) {
  return name.toLowerCase().includes("ammo");
}
function isFoodCategory(name: string) {
  return name.toLowerCase().includes("food");
}
function isWaterCategory(name: string) {
  return name.toLowerCase().includes("water");
}

export default function CategoryGoals({ categoryStats, ammoBreakdown = [], foodBreakdown = [], waterBreakdown = [] }: CategoryGoalsProps) {
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
          {categoryStats.map((stat) => {
            const breakdown = isAmmoCategory(stat.name) ? ammoBreakdown : isFoodCategory(stat.name) ? foodBreakdown : isWaterCategory(stat.name) ? waterBreakdown : null;
            const isFood = isFoodCategory(stat.name);
            const isWater = isWaterCategory(stat.name);
            const row = (
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
                    {"displayUnit" in stat && stat.displayUnit ? ` ${stat.displayUnit}` : ""}
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
            );

            if (breakdown && breakdown.length > 0) {
              return (
                <CategoryRowTooltip
                  key={stat.id}
                  breakdown={breakdown}
                  isFood={isFood}
                  isWater={isWater}
                >
                  {row}
                </CategoryRowTooltip>
              );
            }
            return row;
          })}
        </div>
      </div>
    </div>
  );
}

function CategoryRowTooltip({
  children,
  breakdown,
  isFood,
  isWater,
}: {
  children: React.ReactNode;
  breakdown: AmmoBreakdownItem[] | FoodBreakdownItem[] | WaterBreakdownItem[];
  isFood: boolean;
  isWater: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (() => {
        const total = isWater && breakdown[0] && "gallonsEquivalent" in breakdown[0]
          ? breakdown.reduce((s, i) => s + (i as WaterBreakdownItem).gallonsEquivalent, 0)
          : breakdown.reduce((s, i) => s + i.quantity, 0);
        return (
          <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              {isFood ? "By food item" : isWater ? "By source" : "By type"}
            </div>
            <ul className="space-y-2 text-sm text-gray-900 dark:text-gray-100">
              {breakdown.map((item, i) => {
                const barVal = isWater && "gallonsEquivalent" in item ? item.gallonsEquivalent : item.quantity;
                const pct = total > 0 ? (barVal / total) * 100 : 0;
                return (
                  <li key={i}>
                    <div className="flex justify-between gap-2 mb-0.5">
                      <span className="truncate">{item.name}</span>
                      <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                        {item.quantity} {item.unit}
                        {isFood && "contributionDays" in item && item.contributionDays != null ? ` (~${item.contributionDays}d)` : ""}
                        {isWater && "gallonsEquivalent" in item && item.gallonsEquivalent > 0 && item.unit.toLowerCase().includes("bottle") ? ` (${item.gallonsEquivalent.toFixed(1)} gal)` : ""}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gray-500 dark:bg-gray-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}
    </div>
  );
}
