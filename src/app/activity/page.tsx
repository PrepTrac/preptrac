"use client";

import dynamic from "next/dynamic";
import { api } from "~/utils/api";
import { useMemo, useState } from "react";
import { Activity, Plus, MinusCircle, Trash2, BarChart3 } from "lucide-react";
import RecentActivityList from "~/components/RecentActivityList";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { useDemoMode } from "~/components/DemoModeProvider";

const ActivityCharts = dynamic(
  () => import("~/components/ActivityCharts"),
  { ssr: false }
);

const DAY_PRESETS = [15, 30, 90, 365] as const;

/** Unique ID for form rows; works in older browsers (e.g. Raspberry Pi) that lack crypto.randomUUID(). */
function makeRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface ActivityRow {
  id: string;
  itemId: string;
  quantity: string;
  note: string;
}

const emptyRow = (): ActivityRow => ({
  id: makeRowId(),
  itemId: "",
  quantity: "",
  note: "",
});

export default function ActivityPage() {
  const { readOnly } = useDemoMode();
  const [rows, setRows] = useState<ActivityRow[]>([emptyRow()]);
  const [activityType, setActivityType] = useState<"consumption" | "addition">("consumption");
  const [statsDays, setStatsDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState<number>(60);
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [categoryFilterIds, setCategoryFilterIds] = useState<string[] | null>(null);

  const effectiveDays = useCustomDays ? customDays : statsDays;
  const clampedDays = Math.min(730, Math.max(1, effectiveDays));

  const { data: items, isLoading } = api.items.getList.useQuery();
  const { data: categories } = api.categories.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const { data: stats, isLoading: statsLoading } = api.items.getConsumptionStats.useQuery(
    { days: clampedDays, categoryIds: categoryFilterIds ?? undefined },
    { enabled: clampedDays >= 1 }
  );

  const utils = api.useUtils();
  const recordActivity = api.items.consumeMany.useMutation({
    onSuccess: () => {
      void utils.items.getList.invalidate();
      void utils.items.getRecentConsumption.invalidate();
      void utils.items.getRecentActivity.invalidate();
      void utils.items.getConsumptionStats.invalidate();
      void utils.locations.getConsumptionByLocation.invalidate();
      setRows([emptyRow()]);
    },
  });

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (id: string) =>
    setRows((r) => (r.length > 1 ? r.filter((row) => row.id !== id) : r));
  const updateRow = (id: string, field: keyof ActivityRow, value: string) =>
    setRows((r) =>
      r.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );

  const getItem = (itemId: string) =>
    items?.find((i) => i.id === itemId);

  const { timeSeriesChartData, pieConsumptionData, pieAdditionData, hasAnyActivity } = useMemo(() => {
    if (!stats) {
      return {
        timeSeriesChartData: [],
        pieConsumptionData: [],
        pieAdditionData: [],
        hasAnyActivity: false,
      };
    }
    const start = subDays(new Date(), clampedDays);
    const end = new Date();
    const allDates = eachDayOfInterval({ start, end }).map((d) =>
      format(d, "yyyy-MM-dd")
    );
    const byDate = new Map(
      stats.timeSeries.map((t) => [t.date, t.byItem])
    );
    const timeSeriesChartData = allDates.map((date) => {
      const byItem = byDate.get(date) ?? [];
      let consumption = 0;
      let addition = 0;
      byItem.forEach((item) => {
        consumption += item.consumption ?? 0;
        addition += item.addition ?? 0;
      });
      return {
        date: format(new Date(date), "MMM d"),
        consumption,
        addition,
      };
    });
    const pieConsumptionData = stats.totalsByItem
      .filter((t) => (t.consumption ?? 0) > 0)
      .map((t) => ({
        name: `${t.itemName} (${t.unit})`,
        value: t.consumption ?? 0,
        itemId: t.itemId,
      }));
    const pieAdditionData = stats.totalsByItem
      .filter((t) => (t.addition ?? 0) > 0)
      .map((t) => ({
        name: `${t.itemName} (${t.unit})`,
        value: t.addition ?? 0,
        itemId: t.itemId,
      }));
    const hasAnyActivity =
      stats.timeSeries.some((t) =>
        t.byItem.some((i) => (i.consumption ?? 0) > 0 || (i.addition ?? 0) > 0)
      ) ||
      pieConsumptionData.length > 0 ||
      pieAdditionData.length > 0;
    return {
      timeSeriesChartData,
      pieConsumptionData,
      pieAdditionData,
      hasAnyActivity,
    };
  }, [stats, clampedDays]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entries = rows
      .filter((r) => r.itemId && r.quantity && Number(r.quantity) > 0)
      .map((r) => ({
        itemId: r.itemId,
        quantity: Number(r.quantity),
        note: r.note.trim() || undefined,
      }));
    if (entries.length === 0) return;
    recordActivity.mutate({ activityType, entries });
  };

  const hasValidRows = rows.some(
    (r) => r.itemId && r.quantity && Number(r.quantity) > 0
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Whole page shares one container width so the log form, analytics, and recent
  // list line up edge-to-edge instead of being three different-sized boxes.
  return (
    <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="h-8 w-8 text-amber-500" />
          Activity
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Log when you use items (consume) or restock them (add) — the same form
          handles both. Then review your trends and recent history below.
        </p>
      </header>

      <div className="space-y-8">
        {/* Log activity */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {readOnly && (
            <p className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
              Demo mode is read-only — logging consumption or additions is disabled.
            </p>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 space-y-4">
            {/* Type toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Type
              </span>
              <div
                role="group"
                aria-label="Activity type"
                className="flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-700"
              >
                <button
                  type="button"
                  onClick={() => setActivityType("consumption")}
                  aria-pressed={activityType === "consumption"}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activityType === "consumption"
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <MinusCircle className="h-4 w-4" aria-hidden="true" />
                  Consume
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType("addition")}
                  aria-pressed={activityType === "addition"}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activityType === "addition"
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add
                </button>
              </div>
            </div>

            {/* Entry rows: one wide line each (Item / Amount / Note / remove) */}
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0"
                >
                  <div className="sm:col-span-5">
                    <label
                      htmlFor={`activity-item-${row.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Item
                    </label>
                    <select
                      id={`activity-item-${row.id}`}
                      value={row.itemId}
                      onChange={(e) =>
                        updateRow(row.id, "itemId", e.target.value)
                      }
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required={rows.length === 1}
                    >
                      <option value="">Select item…</option>
                      {items?.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — {item.quantity} {item.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`activity-amount-${row.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Amount
                    </label>
                    <input
                      id={`activity-amount-${row.id}`}
                      type="number"
                      min="0"
                      step="any"
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(row.id, "quantity", e.target.value)
                      }
                      placeholder={
                        row.itemId && activityType === "consumption"
                          ? `max ${getItem(row.itemId)?.quantity ?? "—"}`
                          : "0"
                      }
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label
                      htmlFor={`activity-note-${row.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Note <span className="font-normal">(optional)</span>
                    </label>
                    <input
                      id={`activity-note-${row.id}`}
                      type="text"
                      value={row.note}
                      onChange={(e) => updateRow(row.id, "note", e.target.value)}
                      placeholder={activityType === "addition" ? "e.g. Filled tank" : "e.g. Range day, emergency use"}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      aria-label={`Remove row ${rows.indexOf(row) + 1}`}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      title="Remove row"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another item
              </button>
            )}
          </div>

          {recordActivity.isError && (
            <div
              role="alert"
              className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300 text-sm"
            >
              {recordActivity.error.message}
            </div>
          )}
          {recordActivity.isSuccess && (
            <div
              role="status"
              className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 text-green-700 dark:text-green-300 text-sm"
            >
              {activityType === "addition"
                ? "Addition recorded. Inventory updated."
                : "Consumption recorded. Inventory updated."}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!hasValidRows || recordActivity.isPending || readOnly}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activityType === "addition" ? (
                <Plus className="h-4 w-4 mr-2" />
              ) : (
                <MinusCircle className="h-4 w-4 mr-2" />
              )}
              {recordActivity.isPending
                ? "Recording…"
                : activityType === "addition"
                  ? "Record addition"
                  : "Record consumption"}
            </button>
          </div>
        </form>

        {items?.length === 0 ? (
          // No items yet: there's nothing to analyze, so show one guided callout
          // instead of two empty analytics/recent boxes.
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <p className="text-gray-700 dark:text-gray-200 font-medium">
              No items in inventory yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add items from the Inventory page to start logging activity.
            </p>
            <a
              href="/inventory"
              className="mt-4 inline-block text-amber-600 dark:text-amber-400 hover:underline"
            >
              Go to Inventory →
            </a>
          </div>
        ) : (
          <>
            {/* Analytics */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                Activity analytics
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <fieldset className="min-w-0">
                    <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time range
                    </legend>
                    <div className="flex flex-wrap gap-2 items-center">
                      {DAY_PRESETS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setUseCustomDays(false);
                            setStatsDays(d);
                          }}
                          aria-pressed={!useCustomDays && statsDays === d}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                            !useCustomDays && statsDays === d
                              ? "bg-amber-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={useCustomDays}
                          onChange={(e) => setUseCustomDays(e.target.checked)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Custom</span>
                      </label>
                      {useCustomDays && (
                        <input
                          type="number"
                          min={1}
                          max={730}
                          value={customDays}
                          onChange={(e) => setCustomDays(Number(e.target.value) || 1)}
                          aria-label="Custom range in days"
                          className="w-20 px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      )}
                    </div>
                  </fieldset>

                  <fieldset className="min-w-0">
                    <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Categories
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCategoryFilterIds(null)}
                        aria-pressed={categoryFilterIds === null}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                          categoryFilterIds === null
                            ? "bg-amber-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        All
                      </button>
                      {categories?.map((cat) => {
                        const isActive = categoryFilterIds?.includes(cat.id) ?? false;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (categoryFilterIds === null) {
                                setCategoryFilterIds([cat.id]);
                              } else if (categoryFilterIds.includes(cat.id)) {
                                const next = categoryFilterIds.filter((id) => id !== cat.id);
                                setCategoryFilterIds(next.length === 0 ? null : next);
                              } else {
                                setCategoryFilterIds([...categoryFilterIds, cat.id]);
                              }
                            }}
                            aria-pressed={isActive}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                              isActive
                                ? "bg-amber-600 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>

                {statsLoading && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Loading charts…
                  </div>
                )}

                {!statsLoading && hasAnyActivity && (
                  <ActivityCharts
                    timeSeriesChartData={timeSeriesChartData}
                    pieConsumptionData={pieConsumptionData}
                    pieAdditionData={pieAdditionData}
                    clampedDays={clampedDays}
                  />
                )}

                {!statsLoading && !hasAnyActivity && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                      <BarChart3 className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    </div>
                    <p className="text-gray-700 dark:text-gray-200 font-medium">
                      Nothing to chart yet
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                      Log consumption or additions above and your trends will appear here.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <RecentActivityList
              defaultPageSize={10}
              showTitle={true}
              compact={false}
            />
          </>
        )}
      </div>
    </main>
  );
}
