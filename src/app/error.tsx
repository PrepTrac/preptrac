"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Package } from "lucide-react";

/**
 * App-level error boundary (Next.js App Router convention). Renders inside the
 * root layout, so the nav shell is preserved. Catches unexpected runtime errors
 * in a route segment and offers a branded retry.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface unexpected errors to the browser console for diagnostics.
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-5 px-4 py-20 text-center outline-none"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-[3px] bg-action text-on-action ">
        <Package className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-ink">
          <AlertTriangle className="h-6 w-6 text-caution" aria-hidden="true" />
          Something went wrong
        </h1>
        <p className="text-sm text-muted">
          An unexpected error occurred while loading this page. You can try again —
          your data is safe.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-[3px] border border-transparent bg-action px-4 py-2 text-sm font-medium text-on-action hover:bg-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
      {error?.digest && (
        <p className="font-mono text-xs text-muted">
          Reference: {error.digest}
        </p>
      )}
    </main>
  );
}
