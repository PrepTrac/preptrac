/**
 * Recharts color tokens for the activity charts, themed for light vs dark mode.
 *
 * recharts renders ticks, grids, tooltips and pie labels with its own defaults
 * (dark text on a white tooltip, dark axis ticks), which become illegible in the
 * app's dark mode. `chartTheme()` returns an explicit set of colors/styles so the
 * charts stay readable in both themes. Kept as a pure function so the light/dark
 * values are unit-testable without a DOM.
 */
export interface ChartTooltipStyle {
  backgroundColor: string;
  border: string;
  borderRadius: string;
  color: string;
}

export interface ChartTheme {
  /** Tick + axis label fill. */
  axis: string;
  /** Grid line + axis line stroke. */
  grid: string;
  /** Legend text color. */
  legend: string;
  /** Pie label fill (outer labels). */
  pieLabel: string;
  tooltipStyle: ChartTooltipStyle;
  tooltipItemStyle: { color: string };
  tooltipLabelStyle: { color: string };
}

const LIGHT: ChartTheme = {
  axis: "#4b5563", // gray-600
  grid: "#e5e7eb", // gray-200
  legend: "#374151", // gray-700
  pieLabel: "#374151", // gray-700
  tooltipStyle: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "0.5rem",
    color: "#111827",
  },
  tooltipItemStyle: { color: "#111827" },
  tooltipLabelStyle: { color: "#374151" },
};

const DARK: ChartTheme = {
  axis: "#9ca3af", // gray-400
  grid: "#374151", // gray-700
  legend: "#e5e7eb", // gray-200
  pieLabel: "#e5e7eb", // gray-200
  tooltipStyle: {
    backgroundColor: "#1f2937", // gray-800
    border: "1px solid #374151", // gray-700
    borderRadius: "0.5rem",
    color: "#f3f4f6", // gray-100
  },
  tooltipItemStyle: { color: "#f3f4f6" },
  tooltipLabelStyle: { color: "#d1d5db" }, // gray-300
};

export function chartTheme(isDark: boolean): ChartTheme {
  return isDark ? DARK : LIGHT;
}
