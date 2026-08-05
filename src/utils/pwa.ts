/**
 * PWA behavior, extracted as pure functions so it is unit-testable.
 *
 * `public/sw.js` is served as a static asset and cannot import this module at
 * runtime, so the service worker re-implements the decisions documented here.
 * Keep the two in sync: the contract below is pinned by
 * `src/utils/pwa.test.ts`. When the strategy changes, bump the cache names in
 * `public/sw.js` (its activate handler evicts old caches) and update the
 * constants/`NOTE` here.
 */

/** Cache name family. `public/sw.js` must use matching names. */
export const SW_CACHE_NAMES = {
  main: "preptrac-v2",
  nav: "preptrac-nav-v2",
  static: "preptrac-static-v2",
} as const;

/** App-shell URLs pre-cached on install so the offline fallback works. */
export const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/inventory",
  "/calendar",
  "/settings",
] as const;

/** Fetch-handling strategy the service worker applies for a given request. */
export type FetchStrategy =
  /** Navigation/HTML document: try network, fall back to cached shell offline. */
  | "network-first-navigation"
  /** Hashed build asset under /_next/static/: serve from cache, populate on miss. */
  | "cache-first-static"
  /** Same-origin GET not matched above: network with cache fallback. */
  | "stale-while-revalidate"
  /** Do not intercept (non-GET, cross-origin, or the SW script itself). */
  | "skip";

export interface ClassifyRequest {
  method: string;
  pathname: string;
  /** Request origin (e.g. "https://host"). */
  origin: string;
  /** The service worker's own origin, to decide same-origin. */
  selfOrigin: string;
  /** Request.mode ("navigate" for HTML documents). */
  mode?: string;
}

/**
 * Decide which caching strategy the service worker applies to a request.
 * Mirrors the `fetch` handler in `public/sw.js`. Pure + deterministic.
 */
export function classifyFetchRequest(req: ClassifyRequest): FetchStrategy {
  if (req.method !== "GET") return "skip";
  if (req.origin !== req.selfOrigin) return "skip";
  // Never intercept the service worker script itself.
  if (req.pathname === "/sw.js") return "skip";
  if (req.mode === "navigate") return "network-first-navigation";
  if (req.pathname.startsWith("/_next/static/")) return "cache-first-static";
  return "stale-while-revalidate";
}
