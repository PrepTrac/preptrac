"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { api, type RouterInputs } from "~/utils/api";
import { toDateInputValue } from "~/utils/dates";
import { useDialogDismiss } from "~/hooks/useDialogDismiss";
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

  const panelRef = useDialogDismiss(true, onClose);

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
        // Populate the remaining editable fields so editing reflects saved values.
        expirationDate: toDateInputValue(item.expirationDate),
        lastMaintenanceDate: toDateInputValue(item.lastMaintenanceDate),
        lastRotationDate: toDateInputValue(item.lastRotationDate),
        maintenanceInterval: item.maintenanceInterval ?? undefined,
        rotationSchedule: item.rotationSchedule ?? undefined,
        notes: item.notes ?? "",
        imageUrl: item.imageUrl ?? "",
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

    const selectedCategoryIsFood =
      categories?.find((c) => c.id === data.categoryId)?.name.toLowerCase().includes("food") ?? false;
    const cal = data.caloriesPerUnit;
    const hasCalories = selectedCategoryIsFood && cal != null && !Number.isNaN(cal) && cal > 0;

    // Number inputs use valueAsNumber, so an empty field comes back as NaN/undefined.
    const numOrUndef = (v?: number) =>
      v != null && !Number.isNaN(v) ? Number(v) : undefined;
    const isoOrUndef = (v?: string) => (v ? new Date(v).toISOString() : undefined);

    if (itemId) {
      // Update: send null for cleared optional fields so they can be removed.
      const updatePayload = {
        id: itemId,
        name: data.name,
        description: data.description,
        quantity: Number(data.quantity),
        unit: effectiveUnit,
        categoryId: data.categoryId,
        locationId: data.locationId,
        notes: data.notes?.trim() ? data.notes : null,
        imageUrl: data.imageUrl?.trim() ? data.imageUrl : null,
        minQuantity: Number(data.minQuantity) || 0,
        targetQuantity: targetDisabledByGoal
          ? (item?.targetQuantity ?? 0)
          : Number(data.targetQuantity) || 0,
        expirationDate: isoOrUndef(data.expirationDate) ?? null,
        lastMaintenanceDate: isoOrUndef(data.lastMaintenanceDate) ?? null,
        lastRotationDate: isoOrUndef(data.lastRotationDate) ?? null,
        maintenanceInterval: numOrUndef(data.maintenanceInterval) ?? null,
        rotationSchedule: numOrUndef(data.rotationSchedule) ?? null,
        caloriesPerUnit: hasCalories ? cal : null,
      };
      updateItem.mutate(updatePayload as UpdateInput);
    } else {
      // Create: omit cleared optional fields (create schema uses .optional(), not .nullable()).
      const createPayload = {
        name: data.name,
        description: data.description,
        quantity: Number(data.quantity),
        unit: effectiveUnit,
        categoryId: data.categoryId,
        locationId: data.locationId,
        notes: data.notes,
        imageUrl: data.imageUrl,
        minQuantity: Number(data.minQuantity) || 0,
        targetQuantity: targetDisabledByGoal
          ? (item?.targetQuantity ?? 0)
          : Number(data.targetQuantity) || 0,
        expirationDate: isoOrUndef(data.expirationDate),
        lastMaintenanceDate: isoOrUndef(data.lastMaintenanceDate),
        lastRotationDate: isoOrUndef(data.lastRotationDate),
        maintenanceInterval: numOrUndef(data.maintenanceInterval),
        rotationSchedule: numOrUndef(data.rotationSchedule),
        caloriesPerUnit: hasCalories ? cal : undefined,
      };
      createItem.mutate(createPayload as CreateInput);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={itemId ? "Edit item" : "Add item"}
        tabIndex={-1}
        className="bg-raised rounded-[3px] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="sticky top-0 bg-raised border-b border-line px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-ink">
            {itemId ? "Edit Item" : "Add Item"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted hover:text-muted dark:hover:text-muted rounded-[3px] p-1 -mr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label htmlFor="itemform-name" className="block text-sm font-medium text-ink mb-1">
              Name *
            </label>
              <input
                id="itemform-name"
              {...register("name", { required: true })}
              className={`w-full px-3 py-2 border ${errors.name ? "border-danger" : "border-line"} rounded-[3px] bg-raised text-ink`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-danger">Name is required</p>
            )}
          </div>

          <div>
            <label htmlFor="itemform-description" className="block text-sm font-medium text-ink mb-1">
              Description
            </label>
              <textarea
                id="itemform-description"
              {...register("description")}
              rows={3}
              className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemform-quantity" className="block text-sm font-medium text-ink mb-1">
                Quantity *
              </label>
              <input
                id="itemform-quantity"
                type="number"
                step="0.01"
                {...register("quantity", { required: true, valueAsNumber: true })}
                className={`w-full px-3 py-2 border ${errors.quantity ? "border-danger" : "border-line"} rounded-[3px] bg-raised text-ink`}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-danger">Quantity is required</p>
              )}
            </div>

            <div>
              <label htmlFor="itemform-unit" className="block text-sm font-medium text-ink mb-1">
                Unit *
              </label>
              <select
                id="itemform-unit"
                {...register("unit", { required: true })}
                className={`w-full px-3 py-2 border ${errors.unit ? "border-danger" : "border-line"} rounded-[3px] bg-raised text-ink`}
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
                  aria-label="Custom unit"
                  {...register("unitCustom")}
                  placeholder="e.g. bottles, gallons, kWh"
                  className={`mt-2 w-full px-3 py-2 border ${errors.unitCustom ? "border-danger" : "border-line"} rounded-[3px] bg-raised text-ink`}
                />
              )}
              {errors.unit && (
                <p className="mt-1 text-sm text-danger">Please select a unit</p>
              )}
              {errors.unitCustom && (
                <p className="mt-1 text-sm text-danger">{errors.unitCustom.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemform-locationId" className="block text-sm font-medium text-ink mb-1">
                Location *
              </label>
              <select
                id="itemform-locationId"
                {...register("locationId", { required: true })}
                className={`w-full px-3 py-2 border ${errors.locationId ? "border-danger" : "border-line"} rounded-[3px] bg-raised text-ink`}
              >
                <option value="">Select location</option>
                {locations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              {errors.locationId && (
                <p className="mt-1 text-sm text-danger">Please select a location</p>
              )}
            </div>

            <div>
              <label htmlFor="itemform-categoryId" className="block text-sm font-medium text-ink mb-1">
                Category *
              </label>
              <select
                id="itemform-categoryId"
                {...register("categoryId", { required: true })}
                className={`w-full px-3 py-2 border ${errors.categoryId ? "border-danger" : "border-line"} rounded-[3px] bg-raised text-ink`}
              >
                <option value="">Select category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-danger">Please select a category</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemform-targetQuantity" className={`block text-sm font-medium mb-1 ${targetDisabledByGoal ? "text-muted" : "text-ink"}`}>
                Target Quantity (Goal)
              </label>
              <input
                id="itemform-targetQuantity"
                type="number"
                step="0.01"
                {...register("targetQuantity", { valueAsNumber: true })}
                disabled={targetDisabledByGoal}
                className={`w-full px-3 py-2 border rounded-[3px] ${
                  targetDisabledByGoal
                    ? "border-line bg-surface text-muted cursor-not-allowed"
                    : "border-line bg-raised text-ink"
                }`}
              />
              <p className="mt-1 text-xs text-muted">
                {targetDisabledByGoal
                  ? "Goal is set in Settings → Goals for this category/unit."
                  : "The ideal quantity you want to have for this item"}
              </p>
            </div>

            <div>
              <label htmlFor="itemform-minQuantity" className="block text-sm font-medium text-ink mb-1">
                Low Inventory Threshold
              </label>
              <input
                id="itemform-minQuantity"
                type="number"
                step="0.01"
                {...register("minQuantity", { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
              />
              <p className="mt-1 text-xs text-muted">
                Leave empty or 0 for no threshold alerts. Otherwise you&apos;ll be alerted when quantity falls below this value.
              </p>
            </div>
          </div>

          {isFoodCategory && (
            <div>
              <label htmlFor="itemform-caloriesPerUnit" className="block text-sm font-medium text-ink mb-1">
                Calories per unit *
              </label>
              <input
                id="itemform-caloriesPerUnit"
                type="number"
                step="1"
                min="0"
                {...register("caloriesPerUnit", {
                  valueAsNumber: true,
                  required: "Required for food items",
                  min: { value: 1, message: "Enter calories per single unit (e.g. per jar, per can)" },
                })}
                className={`w-full max-w-xs px-3 py-2 border ${errors.caloriesPerUnit ? "border-danger" : "border-line"} rounded-[3px] bg-raised text-ink`}
                placeholder="e.g. 3100"
              />
              {errors.caloriesPerUnit && (
                <p className="mt-1 text-sm text-danger">{errors.caloriesPerUnit.message}</p>
              )}
              <p className="mt-1 text-xs text-muted">
                Calories per single unit (e.g. per jar, per can, per bag). Total for this item = quantity ×
                calories per unit. Required for Days of Food.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemform-name0" className="block text-sm font-medium text-ink mb-1">
                Expiration Date
              </label>
              <input
                id="itemform-name0"
                type="date"
                {...register("expirationDate")}
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
              />
            </div>

            <div>
              <label htmlFor="itemform-name1" className="block text-sm font-medium text-ink mb-1">
                Image URL
              </label>
              <input
                id="itemform-name1"
                type="url"
                {...register("imageUrl")}
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemform-name2" className="block text-sm font-medium text-ink mb-1">
                Maintenance Interval (days)
              </label>
              <input
                id="itemform-name2"
                type="number"
                {...register("maintenanceInterval", { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
              />
            </div>

            <div>
              <label htmlFor="itemform-name3" className="block text-sm font-medium text-ink mb-1">
                Last Maintenance Date
              </label>
              <input
                id="itemform-name3"
                type="date"
                {...register("lastMaintenanceDate")}
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemform-name4" className="block text-sm font-medium text-ink mb-1">
                Rotation Schedule (days)
              </label>
              <input
                id="itemform-name4"
                type="number"
                {...register("rotationSchedule", { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
              />
            </div>

            <div>
              <label htmlFor="itemform-name5" className="block text-sm font-medium text-ink mb-1">
                Last Rotation Date
              </label>
              <input
                id="itemform-name5"
                type="date"
                {...register("lastRotationDate")}
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
              />
            </div>
          </div>

          <div>
            <label htmlFor="itemform-name6" className="block text-sm font-medium text-ink mb-1">
              Notes
            </label>
              <textarea
                id="itemform-name6"
              {...register("notes")}
              rows={3}
              className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-line rounded-[3px] text-sm font-medium text-ink bg-raised hover:bg-paper dark:hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-[3px] text-sm font-medium text-on-action bg-action hover:bg-action-hover"
            >
              {itemId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

