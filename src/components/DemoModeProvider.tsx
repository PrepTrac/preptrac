"use client";

import { createContext, useContext } from "react";
import type { AppMode } from "~/server/appMode";
import { Lock } from "lucide-react";

/**
 * Client-side knowledge of the app mode.
 *
 * The mode is resolved once on the server (see `src/app/layout.tsx`, which calls
 * `getAppMode()`) and passed down as a prop, so every component can read it
 * synchronously via {@link useDemoMode} with no loading state and no extra
 * network request. The server (`enforceReadOnly` middleware) remains the real
 * authority; this context only drives the UI (hiding/disabling write controls
 * and showing the banner) for a good user experience.
 */
interface DemoModeValue {
  mode: AppMode;
  /** True only in demo mode, where writes are blocked server-side. */
  readOnly: boolean;
}

const DemoModeContext = createContext<DemoModeValue>({
  mode: "clean",
  readOnly: false,
});

export function useDemoMode(): DemoModeValue {
  return useContext(DemoModeContext);
}

/**
 * Renders the read-only banner (when in demo mode) and provides the mode to all
 * descendants. Place once in the root layout, wrapping page content.
 */
export function DemoModeProvider({
  mode,
  children,
}: {
  mode: AppMode;
  children: React.ReactNode;
}) {
  const readOnly = mode === "demo";
  return (
    <DemoModeContext.Provider value={{ mode, readOnly }}>
      {readOnly && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-40 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-300 dark:border-amber-700"
        >
          <Lock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Demo mode — this instance is read-only. Adding, editing, and deleting are disabled.
        </div>
      )}
      {children}
    </DemoModeContext.Provider>
  );
}
