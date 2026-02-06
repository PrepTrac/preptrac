"use client";

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

export interface TimeSeriesPoint {
  date: string;
  consumption: number;
  addition: number;
}

export interface PieDataPoint {
  name: string;
  value: number;
  itemId: string;
}

interface ActivityChartsProps {
  timeSeriesChartData: TimeSeriesPoint[];
  pieConsumptionData: PieDataPoint[];
  pieAdditionData: PieDataPoint[];
  clampedDays: number;
}

export default function ActivityCharts({
  timeSeriesChartData,
  pieConsumptionData,
  pieAdditionData,
  clampedDays,
}: ActivityChartsProps) {
  return (
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
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
  );
}
