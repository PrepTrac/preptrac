"use client";

import { api } from "~/utils/api";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const TYPE_OPTIONS = [
  { value: "all" as const, label: "All" },
  { value: "consumption" as const, label: "Used" },
  { value: "addition" as const, label: "Added" },
];

interface RecentActivityListProps {
  /** Default rows per page */
  defaultPageSize?: 5 | 10 | 25;
  /** Show section title */
  showTitle?: boolean;
  /** Compact layout (e.g. for dashboard) */
  compact?: boolean;
  /** Optional link to full page (e.g. "View all" on dashboard) */
  activityPageHref?: string;
}

export default function RecentActivityList({
  defaultPageSize = 10,
  showTitle = true,
  compact = false,
  activityPageHref,
}: RecentActivityListProps) {
  const [pageSize, setPageSize] = useState<5 | 10 | 25>(defaultPageSize);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<"all" | "consumption" | "addition">("all");
  const [categoryIds, setCategoryIds] = useState<string[] | undefined>(undefined);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);

  const { data: categories } = api.categories.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const { data, isLoading } = api.items.getRecentActivity.useQuery({
    limit: pageSize,
    page,
    type: typeFilter,
    categoryIds,
  });

  const logs = data?.logs ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setPage(1);
  }, [pageSize, typeFilter, categoryIds]);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => {
      const next = prev ?? [];
      if (next.includes(id)) {
        const filtered = next.filter((x) => x !== id);
        return filtered.length === 0 ? undefined : filtered;
      }
      return [...next, id];
    });
  };

  const clearCategoryFilter = () => {
    setCategoryIds(undefined);
    setCategoryFilterOpen(false);
  };

  return (
    <section className={compact ? "" : "mt-10"}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        {showTitle && (
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            Recent activity
            {activityPageHref && (
              <Link
                href={activityPageHref}
                className="text-sm font-normal text-action hover:underline ml-2"
              >
                View all →
              </Link>
            )}
          </h2>
        )}
      </div>

      <div className="open-section overflow-hidden">
        {/* Toolbar: rows per page, type filter, category filter, pagination */}
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted whitespace-nowrap">Show</label>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as 5 | 10 | 25)}
              className="rounded-[3px] border border-line bg-raised text-ink text-sm py-1.5 pl-2 pr-8"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted">rows</span>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            <span className="text-sm text-muted">Type:</span>
            <div className="flex rounded-[3px] border border-line p-0.5 bg-surface">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTypeFilter(opt.value)}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    typeFilter === opt.value
                      ? "bg-raised text-ink "
                      : "text-muted hover:text-ink dark:hover:text-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {categories && categories.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setCategoryFilterOpen((o) => !o)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-[3px] text-sm font-medium ${
                  categoryIds && categoryIds.length > 0
                    ? "bg-caution-soft text-caution bg-caution-soft text-caution"
                    : "bg-surface text-ink hover:bg-surface dark:hover:bg-surface"
                }`}
              >
                Category {categoryIds?.length ? `(${categoryIds.length})` : ""}
              </button>
              {categoryFilterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden="true"
                    onClick={() => setCategoryFilterOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 z-20 w-56 rounded-[3px] border border-line bg-raised shadow-lg py-2 max-h-60 overflow-auto">
                    {categoryIds && categoryIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearCategoryFilter}
                        className="w-full text-left px-3 py-1.5 text-sm text-caution hover:bg-surface dark:hover:bg-surface"
                      >
                        Clear category filter
                      </button>
                    )}
                    {categories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface dark:hover:bg-surface cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={categoryIds?.includes(cat.id) ?? false}
                          onChange={() => toggleCategory(cat.id)}
                          className="rounded border-line text-caution focus:ring-caution"
                        />
                        <span className="text-sm text-ink">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted">
              {totalCount === 0
                ? "No entries"
                : `${from}–${to} of ${totalCount}`}
            </span>
            <div className="flex rounded-[3px] border border-line overflow-hidden">
              <button
                type="button"
                aria-label="Previous activity page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1.5 bg-raised text-ink hover:bg-paper dark:hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1.5 text-sm text-ink border-x border-line">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                aria-label="Next activity page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1.5 bg-raised text-ink hover:bg-paper dark:hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center text-muted text-sm">
            Loading…
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted text-sm">
            No activity matches the current filters.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {logs.map((log) => (
              <li
                key={log.id}
                className={`flex flex-wrap items-baseline justify-between gap-2 ${
                  compact ? "px-4 py-2" : "px-4 py-3"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-ink">
                    {log.item.name}
                  </span>
                  <span className="text-muted ml-2">
                    {log.quantity} {log.item.unit}
                  </span>
                  <span
                    className={`ml-2 text-xs font-medium px-2 py-0.5 rounded ${
                      log.type === "addition"
                        ? "bg-success-soft text-action bg-success-soft text-action"
                        : "bg-danger-soft text-danger bg-danger-soft text-danger"
                    }`}
                  >
                    {log.type === "addition" ? "Added" : "Used"}
                  </span>
                  {log.item.category && !compact && (
                    <span className="ml-2 text-xs text-muted">
                      {log.item.category.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted">
                  {log.note && (
                    <span className="italic">&ldquo;{log.note}&rdquo;</span>
                  )}
                  <time dateTime={new Date(log.createdAt).toISOString()}>
                    {format(new Date(log.createdAt), "MMM d, h:mm a")}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
