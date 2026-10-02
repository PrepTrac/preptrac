"use client";

import { useState } from "react";
import { format } from "date-fns";
import Image from "next/image";
import { Edit, AlertCircle, Wrench } from "lucide-react";
import type { RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";
import { isLowInventory, isExpiringSoon as isItemExpiringSoon, needsMaintenance } from "~/utils/inventory";
import ConfirmDialog from "~/components/ConfirmDialog";
import { useDemoMode } from "~/components/DemoModeProvider";

type Item = RouterOutputs["items"]["getAll"][0];

interface ItemCardProps {
  item: Item;
  onEdit: () => void;
}

export default function ItemCard({ item, onEdit }: ItemCardProps) {
  const { readOnly } = useDemoMode();
  const utils = api.useUtils();
  const deleteItem = api.items.delete.useMutation({
    onSuccess: () => {
      utils.items.getAll.invalidate();
    },
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isExpiringSoon = isItemExpiringSoon(item);

  const needsMaint = needsMaintenance(item);

  const lowInventory = isLowInventory(item);

  return (
    <div className="bg-surface border border-line rounded-[3px] p-4 flex flex-col h-full">
      {item.imageUrl && (
        <div className="relative h-40 w-full mb-4 rounded-[3px] overflow-hidden bg-surface">
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
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-ink">
            {item.name}
          </h3>
          <p className="text-sm text-muted">
            {item.category.name} • {item.location.name}
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={onEdit}
            aria-label={`Edit ${item.name}`}
            title={`Edit ${item.name}`}
            className="p-1 text-muted hover:text-muted dark:hover:text-muted rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <Edit className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="flex justify-between items-end">
          <p className="text-2xl font-bold text-ink">
            {item.quantity} <span className="text-sm font-normal">{item.unit}</span>
          </p>
          {item.targetQuantity > 0 && (
            <p className="text-xs text-muted mb-1">
              Goal: {item.targetQuantity} {item.unit}
            </p>
          )}
        </div>
        {item.targetQuantity > 0 && (
          <div className="mt-2 w-full bg-surface rounded-[3px] h-1.5">
            <div
              className="h-1.5 rounded-[3px] bg-action transition-all duration-500"
              style={{
                width: `${Math.min((item.quantity / item.targetQuantity) * 100, 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {(isExpiringSoon || needsMaint || lowInventory) && (
        <div className="mt-3 space-y-1">
          {isExpiringSoon && item.expirationDate && (
            <div className="flex items-center text-sm text-danger">
              <AlertCircle className="h-4 w-4 mr-1" />
              Expires: {format(new Date(item.expirationDate), "MMM d, yyyy")}
            </div>
          )}
          {needsMaint && (
            <div className="flex items-center text-sm text-caution">
              <Wrench className="h-4 w-4 mr-1" />
              Needs Maintenance
            </div>
          )}
          {lowInventory && (
            <div className="flex items-center text-sm text-caution">
              <AlertCircle className="h-4 w-4 mr-1" />
              Low Inventory
            </div>
          )}
        </div>
      )}

      {item.description && (
        <p className="mt-2 text-sm text-muted line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="mt-auto pt-4 flex justify-end">
        {!readOnly && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-danger hover:text-danger dark:hover:text-danger rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            Delete
          </button>
        )}
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

