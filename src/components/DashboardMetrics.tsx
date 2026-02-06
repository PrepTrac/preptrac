"use client";

import { useState } from "react";
import { Droplet, UtensilsCrossed, Target, Package, Flame } from "lucide-react";

type AmmoBreakdownItem = { name: string; quantity: number; unit: string };
type FoodBreakdownItem = { name: string; quantity: number; unit: string; calories?: number; contributionDays?: number };
type WaterBreakdownItem = { name: string; quantity: number; unit: string; gallonsEquivalent: number };

interface DashboardMetricsProps {
  stats: {
    totalWater?: number;
    waterBreakdown?: WaterBreakdownItem[];
    totalWaterDays?: number;
    useHouseholdForWater?: boolean;
    totalFuelGallons?: number;
    totalKwh?: number;
    batteryKwh?: number;
    totalFoodDays?: number;
    totalAmmo?: number;
    totalItems?: number;
    useHouseholdCalculation?: boolean;
    ammoBreakdown?: AmmoBreakdownItem[];
    foodBreakdown?: FoodBreakdownItem[];
  } | undefined;
}

function BreakdownTooltip<T extends { name: string; quantity: number; unit: string }>({
  children,
  title,
  items,
  renderItem,
  getBarTotal,
  barColorClass = "bg-gray-500 dark:bg-gray-400",
}: {
  children: React.ReactNode;
  title: string;
  items: T[];
  renderItem?: (item: T) => React.ReactNode;
  /** If set, use this to get the value for the bar percentage (e.g. gallonsEquivalent for water). */
  getBarTotal?: (item: T) => number;
  /** Tailwind class for the progress bar fill (e.g. bg-blue-500). Uses category color when set. */
  barColorClass?: string;
}) {
  const [show, setShow] = useState(false);
  if (!items || items.length === 0) return <>{children}</>;
  const total = getBarTotal
    ? items.reduce((s, i) => s + getBarTotal(i), 0)
    : items.reduce((s, i) => s + i.quantity, 0);
  return (
    <div
      className="relative h-full"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</div>
          <ul className="space-y-2 text-sm text-gray-900 dark:text-gray-100">
            {items.map((item, i) => {
              const barVal = getBarTotal ? getBarTotal(item) : item.quantity;
              const pct = total > 0 ? (barVal / total) * 100 : 0;
              return (
                <li key={i}>
                  <div className="flex justify-between gap-2 mb-0.5">
                    {renderItem ? renderItem(item) : (
                      <>
                        <span className="truncate">{item.name}</span>
                        <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                          {item.quantity} {item.unit}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${barColorClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

type FuelDisplayMode = 0 | 1 | 2; // 0 = gallons, 1 = kWh total, 2 = kWh battery only

export default function DashboardMetrics({ stats }: DashboardMetricsProps) {
  const [waterDisplayGallons, setWaterDisplayGallons] = useState(true);
  const [fuelDisplayMode, setFuelDisplayMode] = useState<FuelDisplayMode>(0);

  const cycleFuelDisplay = () =>
    setFuelDisplayMode((m) => ((m + 1) % 3) as FuelDisplayMode);

  const fuelValue =
    fuelDisplayMode === 0
      ? (stats?.totalFuelGallons?.toFixed(1) ?? "0")
      : fuelDisplayMode === 1
        ? (stats?.totalKwh?.toFixed(1) ?? "0")
        : (stats?.batteryKwh?.toFixed(1) ?? "0");
  const fuelUnit =
    fuelDisplayMode === 0 ? "gallons" : "kWh";
  const fuelSubtitle =
    fuelDisplayMode === 1 ? "generator + battery" : fuelDisplayMode === 2 ? "battery only" : undefined;
  const fuelAriaNext =
    fuelDisplayMode === 0 ? "kWh total" : fuelDisplayMode === 1 ? "kWh battery only" : "gallons";

  const foodDaysValue =
    typeof stats?.totalFoodDays === "number"
      ? Number.isInteger(stats.totalFoodDays)
        ? stats.totalFoodDays
        : stats.totalFoodDays.toFixed(1)
      : 0;

  const waterValue = waterDisplayGallons
    ? (stats?.totalWater?.toFixed(1) ?? "0")
    : (stats?.totalWaterDays != null ? stats.totalWaterDays.toFixed(1) : "—");
  const waterUnit = waterDisplayGallons ? "gallons" : "days";
  const waterSubtitle =
    !waterDisplayGallons && stats?.useHouseholdForWater ? "Based on your household" : undefined;

  const waterCard = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setWaterDisplayGallons((g) => !g)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setWaterDisplayGallons((g) => !g);
        }
      }}
      className="h-full bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg cursor-pointer hover:ring-2 hover:ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`Water: ${waterValue} ${waterUnit}. Click to switch to ${waterDisplayGallons ? "days" : "gallons"}.`}
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
            <Droplet className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Total Water
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {waterValue}
                </div>
                <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">{waterUnit}</div>
              </dd>
              {waterSubtitle && (
                <dd className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{waterSubtitle}</dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  const fuelCard = (
    <div
      role="button"
      tabIndex={0}
      onClick={cycleFuelDisplay}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cycleFuelDisplay();
        }
      }}
      className="h-full bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg cursor-pointer hover:ring-2 hover:ring-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
      aria-label={`Fuel/energy: ${fuelValue} ${fuelUnit}. Click to switch to ${fuelAriaNext}.`}
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-amber-500 rounded-md p-3">
            <Flame className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Fuel / Energy
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {fuelValue}
                </div>
                <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">{fuelUnit}</div>
              </dd>
              {fuelSubtitle && (
                <dd className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fuelSubtitle}</dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  const metrics = [
    {
      name: "Food Days",
      value: foodDaysValue,
      unit: "days",
      subtitle: stats?.useHouseholdCalculation ? "Based on your household" : undefined,
      icon: UtensilsCrossed,
      color: "bg-green-500",
      breakdown: stats?.foodBreakdown ?? null,
    },
    {
      name: "Ammo Count",
      value: stats?.totalAmmo ?? 0,
      unit: "rounds",
      subtitle:
        stats?.ammoBreakdown && stats.ammoBreakdown.length > 0
          ? `${stats.ammoBreakdown.length} caliber${stats.ammoBreakdown.length === 1 ? "" : "s"}`
          : undefined,
      icon: Target,
      color: "bg-red-500",
      breakdown: stats?.ammoBreakdown ?? null,
    },
    {
      name: "Total Items",
      value: stats?.totalItems ?? 0,
      unit: "items",
      icon: Package,
      color: "bg-purple-500",
      breakdown: null as AmmoBreakdownItem[] | FoodBreakdownItem[] | null,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
      {stats?.waterBreakdown && stats.waterBreakdown.length > 0 ? (
        <BreakdownTooltip
          title="By source"
          items={stats.waterBreakdown}
          getBarTotal={(item: WaterBreakdownItem) => item.gallonsEquivalent}
          barColorClass="bg-blue-500"
          renderItem={(item: WaterBreakdownItem) => (
            <>
              <span className="truncate">{item.name}</span>
              <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                {item.quantity} {item.unit}
                {item.gallonsEquivalent > 0 && item.unit.toLowerCase().includes("bottle")
                  ? ` (${item.gallonsEquivalent.toFixed(1)} gal)`
                  : ""}
              </span>
            </>
          )}
        >
          {waterCard}
        </BreakdownTooltip>
      ) : (
        waterCard
      )}
      {fuelCard}
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const card = (
          <div
            key={metric.name}
            className="h-full bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
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
                    {"subtitle" in metric && metric.subtitle && (
                      <dd className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {metric.subtitle}
                      </dd>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        );

        if (metric.breakdown && metric.breakdown.length > 0) {
          const isFood = metric.name === "Food Days";
          return (
            <BreakdownTooltip
              key={metric.name}
              title={isFood ? "By calories" : "By type"}
              items={metric.breakdown}
              getBarTotal={isFood ? (item: FoodBreakdownItem) => item.calories ?? item.quantity : undefined}
              barColorClass={metric.color}
              renderItem={isFood ? (item: FoodBreakdownItem) => (
                <>
                  <span className="truncate">{item.name}</span>
                  <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                    {item.quantity} {item.unit}
                    {item.contributionDays != null ? ` (~${item.contributionDays} days)` : ""}
                  </span>
                </>
              ) : undefined}
            >
              {card}
            </BreakdownTooltip>
          );
        }
        return card;
      })}
    </div>
  );
}

