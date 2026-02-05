"use client";

import { format } from "date-fns";
import Image from "next/image";
import { Edit, AlertCircle, Wrench } from "lucide-react";
import type { RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";

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

  const isExpiringSoon =
    item.expirationDate &&
    new Date(item.expirationDate) <=
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const needsMaintenance =
    item.maintenanceInterval &&
    item.lastMaintenanceDate &&
    new Date(
      new Date(item.lastMaintenanceDate).getTime() +
        item.maintenanceInterval * 24 * 60 * 60 * 1000
    ) <= new Date();

  const isLowInventory = item.minQuantity > 0
    ? item.quantity <= item.minQuantity
    : item.quantity <= 10;

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
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <Edit className="h-4 w-4" />
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

      {(isExpiringSoon || needsMaintenance || isLowInventory) && (
        <div className="mt-3 space-y-1">
          {isExpiringSoon && (
            <div className="flex items-center text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 mr-1" />
              Expires: {format(new Date(item.expirationDate!), "MMM d, yyyy")}
            </div>
          )}
          {needsMaintenance && (
            <div className="flex items-center text-sm text-yellow-600 dark:text-yellow-400">
              <Wrench className="h-4 w-4 mr-1" />
              Needs Maintenance
            </div>
          )}
          {isLowInventory && (
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
          onClick={() => {
            if (confirm("Are you sure you want to delete this item?")) {
              deleteItem.mutate({ id: item.id });
            }
          }}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

