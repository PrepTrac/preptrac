"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once on the client. The SW is served with
 * `Cache-Control: no-cache` so the browser checks for updates each load and
 * activates the new version via skipWaiting/clients.claim (see public/sw.js).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("SW registration failed:", err));
    };
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
