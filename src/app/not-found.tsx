import Link from "next/link";
import { Package } from "lucide-react";

/**
 * App-level not-found boundary (Next.js App Router convention). Renders inside
 * the root layout, so the nav shell is preserved. Branded 404.
 */
export default function NotFound() {
  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-5 px-4 py-20 text-center outline-none"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
        <Package className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <p className="text-5xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
          404
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Page not found
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
