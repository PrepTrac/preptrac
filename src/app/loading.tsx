import { Package } from "lucide-react";

/**
 * App-level loading boundary (Next.js App Router convention). Shown while a
 * route segment loads. Branded to match the app shell.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
        <Package className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          Loading PrepTrac…
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Preparing your inventory.
        </p>
      </div>
      <span
        aria-hidden="true"
        className="h-1 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
      >
        <span className="block h-full w-1/3 animate-pulse rounded-full bg-blue-600" />
      </span>
      <span className="sr-only">Loading</span>
    </div>
  );
}
