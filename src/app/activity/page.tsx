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
        <h1 className="text-3xl font-semibold text-ink flex items-center gap-2">
          Activity
        </h1>
        <p className="mt-2 text-muted">
          Log when you use items (consume) or restock them (add) — the same form
          handles both. Then review your trends and recent history below.
        </p>
      </header>

      <div className="space-y-8">
        {/* Log activity */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {readOnly && (
            <p className="rounded-[3px] bg-caution-soft border border-caution p-3 text-sm text-caution">
              Demo mode is read-only — logging consumption or additions is disabled.
            </p>
          )}

          <div className="open-section py-5 space-y-4">
            {/* Type toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-ink">
                Type
              </span>
              <div
                role="group"
                aria-label="Activity type"
                className="flex rounded-[3px] border border-line p-0.5 bg-surface"
              >
                <button
                  type="button"
                  onClick={() => setActivityType("consumption")}
                  aria-pressed={activityType === "consumption"}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-[3px] text-sm font-medium transition-colors ${
                    activityType === "consumption"
                      ? "bg-raised text-ink "
                      : "text-muted hover:text-ink dark:hover:text-muted"
                  }`}
                >
                  <MinusCircle className="h-4 w-4" aria-hidden="true" />
                  Consume
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType("addition")}
                  aria-pressed={activityType === "addition"}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-[3px] text-sm font-medium transition-colors ${
                    activityType === "addition"
                      ? "bg-raised text-ink "
                      : "text-muted hover:text-ink dark:hover:text-muted"
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
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end border-b border-line pb-3 last:border-0 last:pb-0"
                >
                  <div className="sm:col-span-5">
                    <label
                      htmlFor={`activity-item-${row.id}`}
                      className="block text-sm font-medium text-ink mb-1"
                    >
                      Item
                    </label>
                    <select
                      id={`activity-item-${row.id}`}
                      value={row.itemId}
                      onChange={(e) =>
                        updateRow(row.id, "itemId", e.target.value)
                      }
                      className="block w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
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
                      className="block text-sm font-medium text-ink mb-1"
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
                      className="block w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label
                      htmlFor={`activity-note-${row.id}`}
                      className="block text-sm font-medium text-ink mb-1"
                    >
                      Note <span className="font-normal">(optional)</span>
                    </label>
                    <input
                      id={`activity-note-${row.id}`}
                      type="text"
                      value={row.note}
                      onChange={(e) => updateRow(row.id, "note", e.target.value)}
                      placeholder={activityType === "addition" ? "e.g. Filled tank" : "e.g. Range day, emergency use"}
                      className="block w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      aria-label={`Remove row ${rows.indexOf(row) + 1}`}
                      className="p-2 text-muted hover:text-danger dark:hover:text-danger rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
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
                className="inline-flex items-center text-sm font-medium text-caution hover:text-caution dark:hover:text-caution"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another item
              </button>
            )}
          </div>

          {recordActivity.isError && (
            <div
              role="alert"
              className="rounded-[3px] bg-danger-soft p-4 text-danger text-sm"
            >
              {recordActivity.error.message}
            </div>
          )}
          {recordActivity.isSuccess && (
            <div
              role="status"
              className="rounded-[3px] bg-success-soft p-4 text-action text-sm"
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
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-[3px] text-sm font-medium text-on-action bg-action hover:bg-action-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-caution disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-raised rounded-[3px] p-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[3px] bg-caution-soft">
              <Activity className="h-5 w-5 text-caution" aria-hidden="true" />
            </div>
            <p className="text-ink font-medium">
              No items in inventory yet
            </p>
            <p className="text-sm text-muted mt-1">
              Add items from the Inventory page to start logging activity.
            </p>
            <a
              href="/inventory"
              className="mt-4 inline-block text-caution hover:underline"
            >
              Go to Inventory →
            </a>
          </div>
        ) : (
          <>
            {/* Analytics */}
            <section>
              <h2 className="text-xl font-semibold text-ink flex items-center gap-2 mb-4">
                Activity analytics
              </h2>
              <div className="open-section py-5 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <fieldset className="min-w-0">
                    <legend className="block text-sm font-medium text-ink mb-1">
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
                          className={`px-3 py-1.5 rounded-[3px] text-sm font-medium ${
                            !useCustomDays && statsDays === d
                              ? "bg-action text-on-action"
                              : "bg-surface text-ink hover:bg-surface dark:hover:bg-surface"
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
                          className="rounded border-line text-caution focus:ring-caution"
                        />
                        <span className="text-sm text-ink">Custom</span>
                      </label>
                      {useCustomDays && (
                        <input
                          type="number"
                          min={1}
                          max={730}
                          value={customDays}
                          onChange={(e) => setCustomDays(Number(e.target.value) || 1)}
                          aria-label="Custom range in days"
                          className="w-20 px-2 py-1.5 rounded-[3px] border border-line bg-raised text-ink text-sm"
                        />
                      )}
                    </div>
                  </fieldset>

                  <fieldset className="min-w-0">
                    <legend className="block text-sm font-medium text-ink mb-1">
                      Categories
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCategoryFilterIds(null)}
                        aria-pressed={categoryFilterIds === null}
                        className={`px-3 py-1.5 rounded-[3px] text-sm font-medium ${
                          categoryFilterIds === null
                            ? "bg-action text-on-action"
                            : "bg-surface text-ink hover:bg-surface dark:hover:bg-surface"
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
                            className={`px-3 py-1.5 rounded-[3px] text-sm font-medium ${
                              isActive
                                ? "bg-action text-on-action"
                                : "bg-surface text-ink hover:bg-surface dark:hover:bg-surface"
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
                  <div className="text-center py-8 text-muted">
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
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[3px] bg-surface">
                      <BarChart3 className="h-5 w-5 text-muted" aria-hidden="true" />
                    </div>
                    <p className="text-ink font-medium">
                      Nothing to chart yet
                    </p>
                    <p className="text-sm text-muted mt-1 max-w-sm">
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
