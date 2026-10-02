import BrandMark from "~/components/BrandMark";

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
      <span className="flex h-12 w-12 items-center justify-center rounded-[3px] bg-action text-on-action ">
        <BrandMark className="h-8 w-8" />
      </span>
      <div>
        <p className="text-lg font-semibold text-ink">
          Loading PrepTrac…
        </p>
        <p className="mt-1 text-sm text-muted">
          Preparing your inventory.
        </p>
      </div>
      <span
        aria-hidden="true"
        className="h-1 w-24 overflow-hidden rounded-[3px] bg-surface"
      >
        <span className="block h-full w-1/3 animate-pulse rounded-[3px] bg-action" />
      </span>
      <span className="sr-only">Loading</span>
    </div>
  );
}
