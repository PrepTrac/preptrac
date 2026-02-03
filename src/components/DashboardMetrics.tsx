"use client";

import { Droplet, UtensilsCrossed, Target, Package } from "lucide-react";

interface DashboardMetricsProps {
  stats: {
    totalWater?: number;
    totalFoodDays?: number;
    totalAmmo?: number;
    totalItems?: number;
  } | undefined;
}

export default function DashboardMetrics({ stats }: DashboardMetricsProps) {
  const metrics = [
    {
      name: "Total Water",
      value: stats?.totalWater?.toFixed(1) ?? "0",
      unit: "gallons",
      icon: Droplet,
      color: "bg-blue-500",
    },
    {
      name: "Food Days",
      value: stats?.totalFoodDays ?? 0,
      unit: "days",
      icon: UtensilsCrossed,
      color: "bg-green-500",
    },
    {
      name: "Ammo Count",
      value: stats?.totalAmmo ?? 0,
      unit: "rounds",
      icon: Target,
      color: "bg-red-500",
    },
    {
      name: "Total Items",
      value: stats?.totalItems ?? 0,
      unit: "items",
      icon: Package,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.name}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${metric.color} rounded-md p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {metric.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {metric.value}
                      </div>
                      <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        {metric.unit}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

