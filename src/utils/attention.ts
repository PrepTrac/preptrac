import { isExpiringSoon, isLowInventory } from "./inventory";

type DateValue = Date | string;
interface CheckItem {
  id: string;
  name: string;
  location?: { name: string } | null;
}
interface AttentionInput {
  upcomingExpirations?: (CheckItem & { expirationDate: DateValue | null })[];
  needsMaintenance?: (CheckItem & { nextMaintenanceDate: DateValue | null })[];
  lowItems?: (CheckItem & { quantity: number; minQuantity: number; unit: string })[];
  upcomingEvents?: {
    id: string;
    type: string;
    title: string;
    date: DateValue;
    completed?: boolean;
    itemId?: string | null;
    item?: CheckItem | null;
  }[];
}
export interface AttentionCheck {
  id: string;
  name: string;
  type: string;
  due: Date | null;
  location?: string;
  quantity?: string;
}

/** Merge returned records only; API caps mean this is not a full alert count. */
export function deriveAttention(input: AttentionInput, now = new Date()): AttentionCheck[] {
  const checks = new Map<string, AttentionCheck>();
  const date = (value: DateValue | null): Date | null => {
    if (value == null) return null;
    const result = new Date(value);
    return Number.isFinite(result.getTime()) ? result : null;
  };
  const add = (check: AttentionCheck) => {
    const previous = checks.get(check.id);
    if (!previous) checks.set(check.id, check);
    else if (check.due && (!previous.due || check.due < previous.due)) previous.due = check.due;
  };
  for (const item of input.upcomingExpirations ?? []) {
    if (isExpiringSoon(item, now)) add({ id: `${item.id}:expiration`, name: item.name, type: "expiration", due: date(item.expirationDate), location: item.location?.name });
  }
  for (const item of input.needsMaintenance ?? []) {
    const due = date(item.nextMaintenanceDate);
    if (due) add({ id: `${item.id}:maintenance`, name: item.name, type: "maintenance", due, location: item.location?.name });
  }
  for (const event of input.upcomingEvents ?? []) {
    const due = date(event.date);
    if (event.completed || !due) continue;
    if (event.type === "expiration" && !isExpiringSoon({ expirationDate: due }, now)) continue;
    const itemId = event.item?.id ?? event.itemId;
    add({ id: itemId ? `${itemId}:${event.type}` : `event:${event.id}`, name: event.item?.name ?? event.title, type: event.type, due, location: event.item?.location?.name });
  }
  for (const item of input.lowItems ?? []) {
    if (isLowInventory(item)) add({ id: `${item.id}:low_inventory`, name: item.name, type: "low_inventory", due: null, location: item.location?.name, quantity: `${item.quantity} ${item.unit} / minimum ${item.minQuantity}` });
  }
  return [...checks.values()].sort((a, b) => {
    const overdueA = a.type === "maintenance" && a.due && a.due <= now ? 0 : 1;
    const overdueB = b.type === "maintenance" && b.due && b.due <= now ? 0 : 1;
    return overdueA - overdueB || (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}
