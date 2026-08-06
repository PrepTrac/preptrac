"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Edit, Trash2, AlertCircle, Wrench } from "lucide-react";
import type { RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";
import {
  isLowInventory,
  isExpiringSoon,
  needsMaintenance,
} from "~/utils/inventory";
import ConfirmDialog from "~/components/ConfirmDialog";
import { useDemoMode } from "~/components/DemoModeProvider";

type Item = RouterOutputs["items"]["getAll"][0];

interface ItemTableProps {
  items: Item[];
  /** Open the edit form for a specific item id. */
  onEdit: (itemId: string) => void;
}

/**
 * Compact, column/row table view of inventory items — the dense counterpart to
 * {@link ItemCard}. Shares the same status logic (low inventory / expiring soon /
 * maintenance due) via the helpers in `~/utils/inventory`, so the two views never
 * disagree. Status is conveyed with both color and text labels (never color
 * alone) to meet contrast/non-text-content expectations.
 */
export default function ItemTable({ items, onEdit }: ItemTableProps) {
  const { readOnly } = useDemoMode();
  const utils = api.useUtils();
  const deleteItem = api.items.delete.useMutation({
    onSuccess: () => {
      utils.items.getAll.invalidate();
    },
  });
  // "Pending action id" pattern (see ConfirmDialog docs): the row whose delete is
  // awaiting confirmation, or null when the dialog is closed.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDeleteItem = items.find((i) => i.id === pendingDeleteId) ?? null;

  return (
    <div className="overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Category
            </th>
            <th
              scope="col"
              className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Location
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Quantity
            </th>
            <th
              scope="col"
              className="hidden sm:table-cell px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Goal
            </th>
            <th
              scope="col"
              className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Expiration
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Status
            </th>
            {!readOnly && (
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
          {items.map((item) => {
            const expiring = isExpiringSoon(item);
            const low = isLowInventory(item);
            const maintenance = needsMaintenance(item);
            return (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {item.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  {item.category.name}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  {item.location.name}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white whitespace-nowrap">
                  {item.quantity} <span className="text-gray-500 dark:text-gray-400">{item.unit}</span>
                </td>
                <td className="hidden sm:table-cell px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {item.targetQuantity > 0
                    ? `${item.targetQuantity} ${item.unit}`
                    : "—"}
                </td>
                <td className="hidden lg:table-cell px-4 py-3 text-sm whitespace-nowrap">
                  {item.expirationDate ? (
                    <span
                      className={
                        expiring
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-gray-600 dark:text-gray-300"
                      }
                    >
                      {format(new Date(item.expirationDate), "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-col gap-1">
                    {expiring && (
                      <span className="inline-flex items-center text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        Expiring soon
                      </span>
                    )}
                    {low && (
                      <span className="inline-flex items-center text-orange-600 dark:text-orange-400">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        Low inventory
                      </span>
                    )}
                    {maintenance && (
                      <span className="inline-flex items-center text-yellow-600 dark:text-yellow-400">
                        <Wrench className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        Maintenance due
                      </span>
                    )}
                    {!expiring && !low && !maintenance && (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </div>
                </td>
                {!readOnly && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onEdit(item.id)}
                      aria-label={`Edit ${item.name}`}
                      title={`Edit ${item.name}`}
                      className="p-1.5 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(item.id)}
                      aria-label={`Delete ${item.name}`}
                      title={`Delete ${item.name}`}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete item"
        message={
          pendingDeleteItem
            ? `Are you sure you want to delete ${pendingDeleteItem.name}?`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDeleteId) {
            deleteItem.mutate({ id: pendingDeleteId });
          }
          setPendingDeleteId(null);
        }}
        onClose={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
