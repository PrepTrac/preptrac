import Link from "next/link";
import BrandMark from "~/components/BrandMark";

/**
 * App-level not-found boundary (Next.js App Router convention). Renders inside
 * the root layout, so the nav shell is preserved. Branded 404.
 */
export default function NotFound() {
  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-5 px-4 py-20 text-center outline-none"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-[3px] bg-action text-on-action ">
        <BrandMark className="h-8 w-8" />
      </span>
      <div className="space-y-2">
        <p className="text-5xl font-extrabold tracking-tight text-action">
          404
        </p>
        <h1 className="text-2xl font-bold text-ink">
          Page not found
        </h1>
        <p className="text-sm text-muted">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-[3px] border border-transparent bg-action px-4 py-2 text-sm font-medium text-on-action hover:bg-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
