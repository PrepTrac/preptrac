"use client";

import { api } from "~/utils/api";
import { useMemo, useState } from "react";
import Navigation from "~/components/Navigation";
import { Activity, Plus, MinusCircle, Trash2, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import RecentActivityList from "~/components/RecentActivityList";
import { format, subDays, eachDayOfInterval } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316",
];
const CONSUMPTION_COLOR = "#ef4444";
const ADDITION_COLOR = "#22c55e";
const DAY_PRESETS = [15, 30, 90, 365] as const;

interface ActivityRow {
  id: string;
  itemId: string;
  quantity: string;
  note: string;
}

const emptyRow = (): ActivityRow => ({
  id: crypto.randomUUID(),
  itemId: "",
  quantity: "",
  note: "",
});

export default function ActivityPage() {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-8 w-8 text-amber-500" />
              Activity
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Log when you use something (consume) or add to inventory (e.g. refuel). Same inputs for both.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-700">
                  <button
                    type="button"
                    onClick={() => setActivityType("consumption")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activityType === "consumption"
                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    <MinusCircle className="h-4 w-4" />
                    Consume
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityType("addition")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activityType === "addition"
                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>

              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0"
                >
                  <div className="sm:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Item
                    </label>
                    <select
                      value={row.itemId}
                      onChange={(e) =>
                        updateRow(row.id, "itemId", e.target.value)
                      }
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required={rows.length === 1}
                    >
                      <option value="">Select item...</option>
                      {items?.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — {item.quantity} {item.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount
                    </label>
                    <input
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Note (optional)
                    </label>
                    <input
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
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                      title="Remove row"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another item
              </button>
            </div>

            {recordActivity.isError && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300 text-sm">
                {recordActivity.error.message}
              </div>
            )}
            {recordActivity.isSuccess && (
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 text-green-700 dark:text-green-300 text-sm">
                {activityType === "addition"
                  ? "Addition recorded. Inventory updated."
                  : "Consumption recorded. Inventory updated."}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!hasValidRows || recordActivity.isPending}
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

          {items?.length === 0 && (
            <div className="mt-8 text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
              <p className="text-gray-500 dark:text-gray-400">
                No items in inventory yet. Add items from the Inventory page first.
              </p>
              <a
                href="/inventory"
                className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
              >
                Go to Inventory →
              </a>
            </div>
          )}
        </div>

        <section className="mt-12 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            Activity analytics
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 space-y-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time range (days)
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {DAY_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setUseCustomDays(false);
                        setStatsDays(d);
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        !useCustomDays && statsDays === d
                          ? "bg-amber-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                      }`}
                    >
                      {d}
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
                      className="w-20 px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categories (pie & time chart)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryFilterIds(null)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      categoryFilterIds === null
                        ? "bg-amber-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
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
                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                          isActive
                            ? "bg-amber-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {statsLoading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Loading charts…
              </div>
            )}

            {!statsLoading && hasAnyActivity && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Consumption vs additions over last {clampedDays} days
                  </h3>
                  <div className="h-64 sm:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeSeriesChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-gray-600 dark:text-gray-400" />
                        <YAxis tick={{ fontSize: 12 }} className="text-gray-600 dark:text-gray-400" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="consumption" name="Consumed" fill={CONSUMPTION_COLOR} stackId="a" />
                        <Bar dataKey="addition" name="Added" fill={ADDITION_COLOR} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Consumption by item (last {clampedDays} days)
                    </h3>
                    <div className="h-72 sm:h-80 w-full max-w-md mx-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieConsumptionData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius="70%"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {pieConsumptionData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number | string | undefined, name: string | undefined) => [value ?? 0, name ?? ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Additions by item (last {clampedDays} days)
                    </h3>
                    <div className="h-72 sm:h-80 w-full max-w-md mx-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieAdditionData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius="70%"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {pieAdditionData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number | string | undefined, name: string | undefined) => [value ?? 0, name ?? ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!statsLoading && !hasAnyActivity && (
              <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                No consumption or additions in the last {clampedDays} days. Log some above to see charts.
              </p>
            )}
          </div>
        </section>

        <RecentActivityList
          defaultPageSize={10}
          showTitle={true}
          compact={false}
        />
      </main>
    </div>
  );
}
