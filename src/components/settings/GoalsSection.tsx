"use client";

import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import { Target } from "lucide-react";

type GoalsData = {
  ammoGoalRounds: number | null;
  waterGoalGallons: number | null;
  foodGoalDays: number | null;
  fuelGoalGallons: number | null;
  fuelGoalKwh: number | null;
  fuelGoalBatteryKwh: number | null;
};

/** kWh produced per gallon of generator fuel (dashboard uses the same factor). */
const KWH_PER_GALLON = 6;

/**
 * Inventory-goals editor (Settings → Goals).
 *
 * Owns its own query + mutation + cache invalidation so the goals form is
 * self-contained. Goals drive dashboard category progress, so saving also
 * invalidates the dashboard stats query.
 */
export default function GoalsSection() {
  const { data: goals } = api.settings.getGoals.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const utils = api.useUtils();
  const updateGoalsMutation = api.settings.updateGoals.useMutation({
    onSuccess: () => {
      void utils.settings.getGoals.invalidate();
      // Goals drive dashboard category progress; refresh it so changes are visible.
      void utils.dashboard.getStats.invalidate();
    },
  });

  const [ammo, setAmmo] = useState("");
  const [water, setWater] = useState("");
  const [food, setFood] = useState("");
  const [fuelGallons, setFuelGallons] = useState("");
  const [fuelBatteryKwh, setFuelBatteryKwh] = useState("");

  useEffect(() => {
    if (goals) {
      setAmmo(goals.ammoGoalRounds != null ? String(goals.ammoGoalRounds) : "");
      setWater(goals.waterGoalGallons != null ? String(goals.waterGoalGallons) : "");
      setFood(goals.foodGoalDays != null ? String(goals.foodGoalDays) : "");
      setFuelGallons(goals.fuelGoalGallons != null ? String(goals.fuelGoalGallons) : "");
      setFuelBatteryKwh(goals.fuelGoalBatteryKwh != null ? String(goals.fuelGoalBatteryKwh) : "");
    }
  }, [goals]);

  const totalKwh =
    (parseFloat(fuelGallons) || 0) * KWH_PER_GALLON + (parseFloat(fuelBatteryKwh) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gallons = fuelGallons === "" ? null : Number(fuelGallons) || null;
    const battery = fuelBatteryKwh === "" ? null : Number(fuelBatteryKwh) || null;
    const computedKwh =
      gallons == null && battery == null
        ? null
        : (gallons ?? 0) * KWH_PER_GALLON + (battery ?? 0);
    updateGoalsMutation.mutate({
      ammoGoalRounds: ammo === "" ? null : Number(ammo) || null,
      waterGoalGallons: water === "" ? null : Number(water) || null,
      foodGoalDays: food === "" ? null : Number(food) || null,
      fuelGoalGallons: gallons,
      fuelGoalKwh: computedKwh,
      fuelGoalBatteryKwh: battery,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Inventory goals
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Set overall targets here. When a goal is set, the dashboard uses it for that category. Item-level target (goal) fields for matching units are disabled so this page is the single place to manage those goals.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
        <div>
          <label htmlFor="goals-ammo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ammo (rounds)
          </label>
          <input
            id="goals-ammo"
            type="number"
            min={0}
            step={1}
            value={ammo}
            onChange={(e) => setAmmo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g. 1000"
          />
        </div>
        <div>
          <label htmlFor="goals-water" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Water (gallons)
          </label>
          <input
            id="goals-water"
            type="number"
            min={0}
            step={0.1}
            value={water}
            onChange={(e) => setWater(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g. 20"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Items in gallons or bottles are counted (bottles converted to gallons).
          </p>
        </div>
        <div>
          <label htmlFor="goals-food" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Food (days)
          </label>
          <input
            id="goals-food"
            type="number"
            min={0}
            step={1}
            value={food}
            onChange={(e) => setFood(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g. 30"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Target is based on your household and activity level (Settings / profile). Goal = daily calories × days.
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Fuel / energy goals
          </p>
          <div>
            <label id="goals-fuel-kwh-label" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Total kWh
            </label>
            <div
              id="goals-fuel-kwh"
              aria-labelledby="goals-fuel-kwh-label"
              className="w-full px-3 py-2.5 rounded-md bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white font-semibold text-lg tabular-nums"
            >
              {totalKwh.toFixed(1)}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Generator (6 kWh/gal × fuel gallons) + battery + solar kWh.
            </p>
          </div>
          <div>
            <label htmlFor="goals-fuel-gal" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Fuel (gallons)
            </label>
            <input
              id="goals-fuel-gal"
              type="number"
              min={0}
              step={0.1}
              value={fuelGallons}
              onChange={(e) => setFuelGallons(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g. 10"
            />
          </div>
          <div>
            <label htmlFor="goals-fuel-battery" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              battery + solar kWh
            </label>
            <input
              id="goals-fuel-battery"
              type="number"
              min={0}
              step={0.1}
              value={fuelBatteryKwh}
              onChange={(e) => setFuelBatteryKwh(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g. 50"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Items in Fuel &amp; Energy with unit &quot;kWh&quot; (e.g. portable battery banks, solar).
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={updateGoalsMutation.isPending}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {updateGoalsMutation.isPending ? "Saving…" : "Save goals"}
        </button>
      </form>
    </div>
  );
}
