/**
 * PrepTrac service worker.
 *
 * Update-safe strategy:
 *  - Navigations (HTML documents) are NETWORK-FIRST: the browser always gets the
 *    freshest shell, falling back to the cached shell only when offline. This
 *    means users receive new deploys immediately and are never stuck on a stale
 *    app after an update.
 *  - Static build assets (_next/static) are CACHE-FIRST (they are content-hashed
 *    so caching them is safe and fast).
 *  - Non-GET requests and cross-origin requests always go to the network.
 *
 * This file is served with `Cache-Control: no-cache` (see next.config.js) so the
 * browser always revalidates the SW itself and picks up changes promptly.
 *
 * NOTE: bump CACHE_NAME when the strategy changes so old caches are evicted on
 * activate.
 */
const CACHE_NAME = "preptrac-v2";
const NAV_CACHE = "preptrac-nav-v2";
const STATIC_CACHE = "preptrac-static-v2";
const PRECACHE_URLS = ["/", "/dashboard", "/inventory", "/calendar", "/settings"];

self.addEventListener("install", (event) => {
  // Pre-cache the app shell so the offline fallback works, but don't block
  // activation if a precache URL is temporarily unavailable.
  event.waitUntil(
    caches
      .open(NAV_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== NAV_CACHE && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept the service worker itself.
  if (url.pathname === "/sw.js") return;

  // Network-first for navigations (HTML documents).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(NAV_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match("/") || Response.error(),
          ),
        ),
    );
    return;
  }

  // Cache-first for hashed static assets.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Default: try network, fall back to cache.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
