"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { api } from "~/utils/api";
import { X } from "lucide-react";

interface ItemFormProps {
  itemId?: string | null;
  onClose: () => void;
}

interface ItemFormData {
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  categoryId: string;
  locationId: string;
  expirationDate?: string;
  maintenanceInterval?: number;
  lastMaintenanceDate?: string;
  rotationSchedule?: number;
  lastRotationDate?: string;
  notes?: string;
  imageUrl?: string;
}

export default function ItemForm({ itemId, onClose }: ItemFormProps) {
  const { data: item } = api.items.getById.useQuery(
    { id: itemId! },
    { enabled: !!itemId }
  );
  const { data: categories } = api.categories.getAll.useQuery();
  const { data: locations } = api.locations.getAll.useQuery();
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
  } = useForm<ItemFormData>();

  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        description: item.description ?? "",
        quantity: item.quantity,
        unit: item.unit,
        categoryId: item.categoryId,
        locationId: item.locationId,
        expirationDate: item.expirationDate
          ? new Date(item.expirationDate).toISOString().split("T")[0]
          : "",
        maintenanceInterval: item.maintenanceInterval ?? undefined,
        lastMaintenanceDate: item.lastMaintenanceDate
          ? new Date(item.lastMaintenanceDate).toISOString().split("T")[0]
          : "",
        rotationSchedule: item.rotationSchedule ?? undefined,
        lastRotationDate: item.lastRotationDate
          ? new Date(item.lastRotationDate).toISOString().split("T")[0]
          : "",
        notes: item.notes ?? "",
        imageUrl: item.imageUrl ?? "",
      });
    }
  }, [item, reset]);

  const onSubmit = (data: ItemFormData) => {
    const submitData = {
      ...data,
      quantity: Number(data.quantity),
      expirationDate: data.expirationDate
        ? new Date(data.expirationDate)
        : undefined,
      lastMaintenanceDate: data.lastMaintenanceDate
        ? new Date(data.lastMaintenanceDate)
        : undefined,
      lastRotationDate: data.lastRotationDate
        ? new Date(data.lastRotationDate)
        : undefined,
      maintenanceInterval: data.maintenanceInterval
        ? Number(data.maintenanceInterval)
        : undefined,
      rotationSchedule: data.rotationSchedule
        ? Number(data.rotationSchedule)
        : undefined,
    };

    if (itemId) {
      updateItem.mutate({ id: itemId, ...submitData });
    } else {
      createItem.mutate(submitData);
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">Name is required</p>
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit *
              </label>
              <input
                {...register("unit", { required: true })}
                placeholder="gallons, rounds, days, etc."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                {...register("categoryId", { required: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location *
              </label>
              <select
                {...register("locationId", { required: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select location</option>
                {locations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

