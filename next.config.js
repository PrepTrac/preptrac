/** @type {import('next').NextConfig} */

const securityHeaders = [
  // The service worker must always revalidate so deployed SW updates are picked
  // up promptly instead of being served stale from the browser cache.
  {
    source: "/sw.js",
    headers: [
      { key: "Cache-Control", value: "no-cache, must-revalidate" },
      { key: "Service-Worker-Allowed", value: "/" },
    ],
  },
  // The manifest changes between deploys; avoid caching a stale copy.
  {
    source: "/manifest.json",
    headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  async headers() {
    return securityHeaders;
  },
};

module.exports = nextConfig;
