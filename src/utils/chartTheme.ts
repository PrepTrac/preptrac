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
  axis: "#596151", grid: "#c1c6b5", legend: "#293126", pieLabel: "#293126",
  tooltipStyle: { backgroundColor: "#faf9f2", border: "1px solid #c1c6b5", borderRadius: "3px", color: "#293126" },
  tooltipItemStyle: { color: "#293126" }, tooltipLabelStyle: { color: "#293126" },
};
const DARK: ChartTheme = {
  axis: "#bcc6af", grid: "#4b5842", legend: "#f1f0e3", pieLabel: "#f1f0e3",
  tooltipStyle: { backgroundColor: "#343f2f", border: "1px solid #4b5842", borderRadius: "3px", color: "#f1f0e3" },
  tooltipItemStyle: { color: "#f1f0e3" }, tooltipLabelStyle: { color: "#f1f0e3" },
};

export function chartTheme(isDark: boolean): ChartTheme { return isDark ? DARK : LIGHT; }
