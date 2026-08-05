import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  classifyFetchRequest,
  PRECACHE_URLS,
  SW_CACHE_NAMES,
} from "./pwa";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "../../..");
const SELF = "https://preptrac.example";

describe("classifyFetchRequest", () => {
  it("routes navigations network-first", () => {
    expect(
      classifyFetchRequest({ method: "GET", pathname: "/", origin: SELF, selfOrigin: SELF, mode: "navigate" }),
    ).toBe("network-first-navigation");
  });

  it("routes hashed static assets cache-first", () => {
    expect(
      classifyFetchRequest({
        method: "GET",
        pathname: "/_next/static/chunks/app.js",
        origin: SELF,
        selfOrigin: SELF,
      }),
    ).toBe("cache-first-static");
  });

  it("skips non-GET requests", () => {
    expect(
      classifyFetchRequest({ method: "POST", pathname: "/api/trpc", origin: SELF, selfOrigin: SELF }),
    ).toBe("skip");
  });

  it("skips cross-origin requests", () => {
    expect(
      classifyFetchRequest({ method: "GET", pathname: "/x", origin: "https://other.example", selfOrigin: SELF }),
    ).toBe("skip");
  });

  it("never intercepts the service worker script itself", () => {
    expect(
      classifyFetchRequest({ method: "GET", pathname: "/sw.js", origin: SELF, selfOrigin: SELF }),
    ).toBe("skip");
  });

  it("uses stale-while-revalidate for other same-origin GETs", () => {
    expect(
      classifyFetchRequest({ method: "GET", pathname: "/api/health", origin: SELF, selfOrigin: SELF }),
    ).toBe("stale-while-revalidate");
  });
});

describe("PWA strategy constants (mirror public/sw.js)", () => {
  it("declares the precache app-shell URLs", () => {
    expect(PRECACHE_URLS).toContain("/dashboard");
    expect(PRECACHE_URLS.length).toBeGreaterThan(0);
  });

  it("declares the v2 cache-name family that sw.js uses", () => {
    expect(SW_CACHE_NAMES.nav).toBe("preptrac-nav-v2");
    expect(SW_CACHE_NAMES.static).toBe("preptrac-static-v2");
  });
});

describe("public/manifest.json", () => {
  const manifestPath = path.join(repoRoot, "public", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  it("is a standalone installable web app", () => {
    expect(manifest.display).toBe("standalone");
    expect(typeof manifest.name).toBe("string");
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(manifest.start_url).toBeTruthy();
  });

  it("declares the required 192 and 512 icons", () => {
    const sizes = (manifest.icons as Array<{ sizes: string }>).map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });
});
