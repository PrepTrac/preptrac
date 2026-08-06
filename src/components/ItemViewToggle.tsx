"use client";

import { Table, LayoutGrid } from "lucide-react";

/** The two item-list layouts supported across the app. */
export type ItemView = "table" | "cards";

interface ItemViewToggleProps {
  value: ItemView;
  onChange: (view: ItemView) => void;
  /** Extra classes for the wrapper (e.g. alignment within a flex toolbar). */
  className?: string;
}

/**
 * Segmented Table/Cards view toggle, shared by the Inventory and Locations pages
 * so both controls look and behave identically.
 *
 * Accessibility: exposed as a labelled button group (`role="group"`) with
 * `aria-pressed` on each option, so screen-reader users hear which view is
 * active. Icons are decorative (`aria-hidden`) and each button has a text label,
 * so the control never relies on imagery alone.
 */
export default function ItemViewToggle({
  value,
  onChange,
  className = "",
}: ItemViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Items view"
      className={`inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden ${className}`}
    >
      <button
        type="button"
        aria-pressed={value === "table"}
        onClick={() => onChange("table")}
        className={`inline-flex items-center px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
          value === "table"
            ? "bg-blue-600 text-white"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        <Table className="h-4 w-4 mr-1.5" aria-hidden="true" />
        Table
      </button>
      <button
        type="button"
        aria-pressed={value === "cards"}
        onClick={() => onChange("cards")}
        className={`inline-flex items-center px-3 py-2 text-sm font-medium border-l border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
          value === "cards"
            ? "bg-blue-600 text-white"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        <LayoutGrid className="h-4 w-4 mr-1.5" aria-hidden="true" />
        Cards
      </button>
    </div>
  );
}
