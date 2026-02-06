"use client";

import { api } from "~/utils/api";
import { useState, useEffect } from "react";
import { History, ChevronLeft, ChevronRight, Filter } from "lucide-react";
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
  /** Optional link to full Activity page (e.g. "View all" on dashboard) */
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

  const { data: categories } = api.categories.getAll.useQuery();
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            Recent activity
            {activityPageHref && (
              <Link
                href={activityPageHref}
                className="text-sm font-normal text-blue-600 dark:text-blue-400 hover:underline ml-2"
              >
                View all →
              </Link>
            )}
          </h2>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Toolbar: rows per page, type filter, category filter, pagination */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Show</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as 5 | 10 | 25)}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm py-1.5 pl-2 pr-8"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">rows</span>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
            <div className="flex rounded-md border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-700">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTypeFilter(opt.value)}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    typeFilter === opt.value
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
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
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ${
                  categoryIds && categoryIds.length > 0
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
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
                  <div className="absolute left-0 top-full mt-1 z-20 w-56 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-2 max-h-60 overflow-auto">
                    {categoryIds && categoryIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearCategoryFilter}
                        className="w-full text-left px-3 py-1.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Clear category filter
                      </button>
                    )}
                    {categories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={categoryIds?.includes(cat.id) ?? false}
                          onChange={() => toggleCategory(cat.id)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {totalCount === 0
                ? "No entries"
                : `${from}–${to} of ${totalCount}`}
            </span>
            <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            Loading…
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            No activity matches the current filters.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <li
                key={log.id}
                className={`flex flex-wrap items-baseline justify-between gap-2 ${
                  compact ? "px-4 py-2" : "px-4 py-3"
                }`}
              >
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {log.item.name}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">
                    {log.quantity} {log.item.unit}
                  </span>
                  <span
                    className={`ml-2 text-xs font-medium px-2 py-0.5 rounded ${
                      log.type === "addition"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {log.type === "addition" ? "Added" : "Used"}
                  </span>
                  {log.item.category && !compact && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {log.item.category.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
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
