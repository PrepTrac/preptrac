"use client";

import Link from "next/link";
import { format } from "date-fns";
import { deriveAttention } from "~/utils/attention";
import { getEventBadgeClass, getEventLabel } from "~/utils/eventStyles";
import type { RouterOutputs } from "~/utils/api";

export default function AttentionList({ stats, lowItems, loading = false, error = false }: {
  stats: RouterOutputs["dashboard"]["getStats"];
  lowItems?: RouterOutputs["items"]["getAll"];
  loading?: boolean;
  error?: boolean;
}) {
  const now = new Date();
  const checks = deriveAttention({ ...stats, lowItems }, now);
  return <section aria-labelledby="attention-heading" className="min-w-0">
    <div className="section-heading"><h2 id="attention-heading">Needs attention</h2><span className="text-xs text-muted">{checks.length} returned checks</span></div>
    <p className="text-xs text-muted mb-3">Expiration within 30 days, scheduled maintenance and upcoming events. Results may be capped.</p>
    {loading && <p role="status" className="text-sm text-muted py-2">Loading low-inventory checks…</p>}
    {error && <p role="alert" className="text-sm text-danger py-2">Low-inventory checks could not load. Review Inventory for the full list.</p>}
    {!checks.length && !loading && !error ? <p className="py-6 text-sm text-muted">No checks in the displayed window.</p> : <ul className="divide-y divide-line">
      {checks.slice(0, 6).map(check => <li key={check.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
        <div className="min-w-0 flex-1 basis-40"><p className="font-medium [overflow-wrap:anywhere]">{check.name}</p>{check.location && <p className="text-xs text-muted mt-1 [overflow-wrap:anywhere]">{check.location}</p>}{check.quantity && <p className="text-xs text-muted mt-1">{check.quantity}</p>}</div>
        <div className="text-right text-xs space-y-1"><span className={`inline-block px-2 py-1 rounded-[3px] ${check.type === "low_inventory" ? "bg-caution-soft text-caution" : getEventBadgeClass(check.type)}`}>{check.type === "maintenance" && check.due && check.due <= now ? "Maintenance due" : check.type === "expiration" ? "Expiring soon" : getEventLabel(check.type)}</span>{check.due && <time className="block text-muted font-mono" dateTime={check.due.toISOString()}>{format(check.due, "MMM d, yyyy")}</time>}</div>
      </li>)}
    </ul>}
    <div className="flex flex-wrap gap-5 mt-4 text-sm"><Link href="/inventory" className="text-action hover:underline">Review inventory →</Link><Link href="/calendar" className="text-action hover:underline">Open calendar →</Link></div>
  </section>;
}
