"use client";

import { useState } from "react";
import { format } from "date-fns";
import Image from "next/image";
import { Edit, AlertCircle, Wrench } from "lucide-react";
import type { RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";
import { isLowInventory, isExpiringSoon as isItemExpiringSoon } from "~/utils/inventory";
import ConfirmDialog from "~/components/ConfirmDialog";

type Item = RouterOutputs["items"]["getAll"][0];

interface ItemCardProps {
  item: Item;
  onEdit: () => void;
}

export default function ItemCard({ item, onEdit }: ItemCardProps) {
  const utils = api.useUtils();
  const deleteItem = api.items.delete.useMutation({
    onSuccess: () => {
      utils.items.getAll.invalidate();
    },
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isExpiringSoon = isItemExpiringSoon(item);

  const needsMaintenance =
    item.maintenanceInterval &&
    item.lastMaintenanceDate &&
    new Date(
      new Date(item.lastMaintenanceDate).getTime() +
        item.maintenanceInterval * 24 * 60 * 60 * 1000
    ) <= new Date();

  const lowInventory = isLowInventory(item);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col h-full">
      {item.imageUrl && (
        <div className="relative h-40 w-full mb-4 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {item.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {item.category.name} • {item.location.name}
          </p>
        </div>
        <button
          onClick={onEdit}
          aria-label={`Edit ${item.name}`}
          title={`Edit ${item.name}`}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Edit className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3">
        <div className="flex justify-between items-end">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {item.quantity} <span className="text-sm font-normal">{item.unit}</span>
          </p>
          {item.targetQuantity > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Goal: {item.targetQuantity} {item.unit}
            </p>
          )}
        </div>
        {item.targetQuantity > 0 && (
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${Math.min((item.quantity / item.targetQuantity) * 100, 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {(isExpiringSoon || needsMaintenance || lowInventory) && (
        <div className="mt-3 space-y-1">
          {isExpiringSoon && item.expirationDate && (
            <div className="flex items-center text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 mr-1" />
              Expires: {format(new Date(item.expirationDate), "MMM d, yyyy")}
            </div>
          )}
          {needsMaintenance && (
            <div className="flex items-center text-sm text-yellow-600 dark:text-yellow-400">
              <Wrench className="h-4 w-4 mr-1" />
              Needs Maintenance
            </div>
          )}
          {lowInventory && (
            <div className="flex items-center text-sm text-orange-600 dark:text-orange-400">
              <AlertCircle className="h-4 w-4 mr-1" />
              Low Inventory
            </div>
          )}
        </div>
      )}

      {item.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="mt-auto pt-4 flex justify-end">
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Delete
        </button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete item"
        message={`Are you sure you want to delete ${item.name}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteItem.mutate({ id: item.id });
          setConfirmDelete(false);
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

