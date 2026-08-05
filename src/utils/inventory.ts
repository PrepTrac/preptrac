/**
 * Unified inventory threshold helpers.
 *
 * "Low inventory" is defined consistently across the app as: an item has an
 * explicit low-inventory threshold set (minQuantity > 0) and its current quantity
 * is at or below that threshold. This matches:
 *  - `items.getAll({ lowInventory })` SQL filter in src/server/api/routers/items.ts
 *  - the low-inventory webhook scan in src/server/api/routers/webhooks.ts
 *
 * Items without a threshold are never flagged low (the legacy `quantity <= 10`
 * fallback is intentionally removed so behavior is consistent everywhere).
 */

export interface InventoryQuantity {
  quantity: number;
  minQuantity: number;
}

/** True when an item is at/below its low-inventory threshold. */
export function isLowInventory(item: InventoryQuantity): boolean {
  return item.minQuantity > 0 && item.quantity <= item.minQuantity;
}
