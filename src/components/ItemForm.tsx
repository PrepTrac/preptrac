"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { api, type RouterInputs } from "~/utils/api";
import { X } from "lucide-react";

/** Predefined units for dropdown. Use exact strings so dashboard/goals matching works (e.g. gallons, bottles, rounds, kWh). */
const POPULAR_UNITS = [
  "gallons",
  "bottles",
  "rounds",
  "kWh",
  "cans",
  "lbs",
  "meals",
  "jars",
  "packets",
  "tablets",
  "kit",
  "boxes",
  "rolls",
  "units",
  "sheets",
  "tanks",
  "count",
  "days",
] as const;

const OTHER_UNIT_SENTINEL = "__other__";

interface ItemFormProps {
  itemId?: string | null;
  defaultLocationId?: string;
  onClose: () => void;
}

interface ItemFormData {
  name: string;
  description?: string;
  quantity: number;
  /** Either a value from POPULAR_UNITS or OTHER_UNIT_SENTINEL when "Other" is selected. */
  unit: string;
  /** Custom unit text when unit === OTHER_UNIT_SENTINEL. */
  unitCustom?: string;
  categoryId: string;
  locationId: string;
  expirationDate?: string;
  maintenanceInterval?: number;
  lastMaintenanceDate?: string;
  rotationSchedule?: number;
  lastRotationDate?: string;
  notes?: string;
  imageUrl?: string;
  minQuantity: number;
  targetQuantity: number;
  caloriesPerUnit?: number;
}

export default function ItemForm({ itemId, defaultLocationId, onClose }: ItemFormProps) {
  const { data: item } = api.items.getById.useQuery(
    { id: itemId ?? "" },
    { enabled: !!itemId }
  );
  const { data: categories } = api.categories.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const { data: locations } = api.locations.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const { data: goals } = api.settings.getGoals.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const utils = api.useUtils();

  const createItem = api.items.create.useMutation({
    onSuccess: () => {
      utils.items.getAll.invalidate();
      onClose();
    },
  });

  const updateItem = api.items.update.useMutation({
    onSuccess: () => {
      utils.items.getAll.invalidate();
      onClose();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm<ItemFormData>();

  const selectedCategoryId = watch("categoryId");
  const selectedUnit = watch("unit");
  const unitCustom = watch("unitCustom");
  /** Effective unit for goal matching: predefined value or custom when "Other" is selected. */
  const effectiveUnit =
    selectedUnit === OTHER_UNIT_SENTINEL ? (unitCustom ?? "").trim() : (selectedUnit ?? "");
  const category = categories?.find((c) => c.id === selectedCategoryId);
  const categoryNameLower = category?.name.toLowerCase() ?? "";
  const isFoodCategory = categoryNameLower.includes("food");
  const isAmmoCategory = categoryNameLower.includes("ammo");
  const isWaterCategory = categoryNameLower.includes("water");
  const isFuelCategory = categoryNameLower.includes("fuel") || categoryNameLower.includes("energy");
  const unitIsRounds = /round(s)?/i.test(effectiveUnit);
  const unitIsGallons = /gallon(s)?/i.test(effectiveUnit);
  const unitIsBottles = /bottle(s)?/i.test(effectiveUnit);
  const unitIsKwh = /kwh/i.test(effectiveUnit);
  const targetDisabledByGoal =
    (isAmmoCategory && unitIsRounds && goals?.ammoGoalRounds != null && goals.ammoGoalRounds > 0) ||
    (isWaterCategory && (unitIsGallons || unitIsBottles) && goals?.waterGoalGallons != null && goals.waterGoalGallons > 0) ||
    (isFoodCategory && goals?.foodGoalDays != null && goals.foodGoalDays > 0) ||
    (isFuelCategory && unitIsGallons && goals?.fuelGoalGallons != null && goals.fuelGoalGallons > 0) ||
    (isFuelCategory && unitIsKwh && ((goals?.fuelGoalKwh != null && goals.fuelGoalKwh > 0) || (goals?.fuelGoalBatteryKwh != null && goals.fuelGoalBatteryKwh > 0)));

  useEffect(() => {
    if (item) {
      const itemWithCal = item as { caloriesPerUnit?: number | null };
      const isPopular = POPULAR_UNITS.includes(item.unit as (typeof POPULAR_UNITS)[number]);
      reset({
        name: item.name,
        description: item.description ?? "",
        quantity: item.quantity,
        unit: isPopular ? item.unit : OTHER_UNIT_SENTINEL,
        unitCustom: isPopular ? "" : item.unit,
        categoryId: item.categoryId,
        locationId: item.locationId,
        minQuantity: item.minQuantity ?? 0,
        targetQuantity: item.targetQuantity ?? 0,
        caloriesPerUnit: itemWithCal.caloriesPerUnit ?? undefined,
      });
    } else if (defaultLocationId) {
      reset({
        name: "",
        description: "",
        quantity: 0,
        unit: "",
        unitCustom: "",
        categoryId: "",
        locationId: defaultLocationId,
        expirationDate: "",
        maintenanceInterval: undefined,
        lastMaintenanceDate: "",
        rotationSchedule: undefined,
        lastRotationDate: "",
        notes: "",
        imageUrl: "",
        minQuantity: 0,
        targetQuantity: 0,
        caloriesPerUnit: undefined,
      });
    }
  }, [item, defaultLocationId, reset]);

  const onSubmit = (data: ItemFormData) => {
    const effectiveUnit =
      data.unit === OTHER_UNIT_SENTINEL ? (data.unitCustom ?? "").trim() : data.unit;
    if (data.unit === OTHER_UNIT_SENTINEL && !effectiveUnit) {
      setError("unitCustom", { type: "required", message: "Enter a unit (e.g. bottles, gallons)" });
      return;
    }
    clearErrors("unitCustom");

    type CreateInput = RouterInputs["items"]["create"];
    type UpdateInput = RouterInputs["items"]["update"];
    /** Payload we build: dates as ISO strings for API, caloriesPerUnit may be null for update. */
    const submitData: Omit<CreateInput, "expirationDate" | "lastMaintenanceDate" | "lastRotationDate" | "caloriesPerUnit"> & {
      expirationDate?: string;
      lastMaintenanceDate?: string;
      lastRotationDate?: string;
      caloriesPerUnit?: number | null;
    } = {
      name: data.name,
      description: data.description,
      quantity: Number(data.quantity),
      unit: effectiveUnit,
      categoryId: data.categoryId,
      locationId: data.locationId,
      notes: data.notes,
      imageUrl: data.imageUrl,
      minQuantity: Number(data.minQuantity) || 0,
      targetQuantity: targetDisabledByGoal ? (item?.targetQuantity ?? 0) : Number(data.targetQuantity) || 0,
    };
    const selectedCategoryIsFood =
      categories?.find((c) => c.id === data.categoryId)?.name.toLowerCase().includes("food") ?? false;
    const cal = data.caloriesPerUnit;
    if (selectedCategoryIsFood && cal != null && !Number.isNaN(cal) && cal > 0) {
      submitData.caloriesPerUnit = cal;
    } else if (itemId) {
      submitData.caloriesPerUnit = null;
    }

    // Only include date fields if they have values (send ISO strings for API)
    if (data.expirationDate) {
      submitData.expirationDate = new Date(data.expirationDate).toISOString();
    }
    if (data.lastMaintenanceDate) {
      submitData.lastMaintenanceDate = new Date(data.lastMaintenanceDate).toISOString();
    }
    if (data.lastRotationDate) {
      submitData.lastRotationDate = new Date(data.lastRotationDate).toISOString();
    }
    if (data.maintenanceInterval) {
      submitData.maintenanceInterval = Number(data.maintenanceInterval);
    }
    if (data.rotationSchedule) {
      submitData.rotationSchedule = Number(data.rotationSchedule);
    }

    if (itemId) {
      updateItem.mutate({ id: itemId, ...submitData } as UpdateInput);
    } else {
      createItem.mutate(submitData as CreateInput);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {itemId ? "Edit Item" : "Add Item"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              {...register("name", { required: true })}
              className={`w-full px-3 py-2 border ${errors.name ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">Name is required</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                step="0.01"
                {...register("quantity", { required: true, valueAsNumber: true })}
                className={`w-full px-3 py-2 border ${errors.quantity ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">Quantity is required</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit *
              </label>
              <select
                {...register("unit", { required: true })}
                className={`w-full px-3 py-2 border ${errors.unit ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              >
                <option value="">Select unit</option>
                {POPULAR_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value={OTHER_UNIT_SENTINEL}>Other (type your own)</option>
              </select>
              {selectedUnit === OTHER_UNIT_SENTINEL && (
                <input
                  {...register("unitCustom")}
                  placeholder="e.g. bottles, gallons, kWh"
                  className={`mt-2 w-full px-3 py-2 border ${errors.unitCustom ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                />
              )}
              {errors.unit && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">Please select a unit</p>
              )}
              {errors.unitCustom && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.unitCustom.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location *
              </label>
              <select
                {...register("locationId", { required: true })}
                className={`w-full px-3 py-2 border ${errors.locationId ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              >
                <option value="">Select location</option>
                {locations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              {errors.locationId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">Please select a location</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                {...register("categoryId", { required: true })}
                className={`w-full px-3 py-2 border ${errors.categoryId ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              >
                <option value="">Select category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">Please select a category</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${targetDisabledByGoal ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
                Target Quantity (Goal)
              </label>
              <input
                type="number"
                step="0.01"
                {...register("targetQuantity", { valueAsNumber: true })}
                disabled={targetDisabledByGoal}
                className={`w-full px-3 py-2 border rounded-md ${
                  targetDisabledByGoal
                    ? "border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                }`}
              />
              <p className="mt-1 text-xs text-gray-500">
                {targetDisabledByGoal
                  ? "Goal is set in Settings → Goals for this category/unit."
                  : "The ideal quantity you want to have for this item"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Low Inventory Threshold
              </label>
              <input
                type="number"
                step="0.01"
                {...register("minQuantity", { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500">
                Alert when quantity falls below this value (defaults to 10 if 0)
              </p>
            </div>
          </div>

          {isFoodCategory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Calories per unit *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                {...register("caloriesPerUnit", {
                  valueAsNumber: true,
                  required: "Required for food items",
                  min: { value: 1, message: "Enter calories per single unit (e.g. per jar, per can)" },
                })}
                className={`w-full max-w-xs px-3 py-2 border ${errors.caloriesPerUnit ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="e.g. 3100"
              />
              {errors.caloriesPerUnit && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.caloriesPerUnit.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Calories per single unit (e.g. per jar, per can, per bag). Total for this item = quantity ×
                calories per unit. Required for Days of Food.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiration Date
              </label>
              <input
                type="date"
                {...register("expirationDate")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Image URL
              </label>
              <input
                type="url"
                {...register("imageUrl")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maintenance Interval (days)
              </label>
              <input
                type="number"
                {...register("maintenanceInterval", { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Maintenance Date
              </label>
              <input
                type="date"
                {...register("lastMaintenanceDate")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rotation Schedule (days)
              </label>
              <input
                type="number"
                {...register("rotationSchedule", { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Rotation Date
              </label>
              <input
                type="date"
                {...register("lastRotationDate")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {itemId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

