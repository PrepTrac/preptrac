"use client";

import { useEffect, useRef, useState } from "react";

export const SETTINGS_TABS = [
  "goals",
  "notifications",
  "categories",
  "locations",
  "import",
  "testdata",
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function isSettingsTab(t: string): t is SettingsTab {
  return (SETTINGS_TABS as readonly string[]).includes(t);
}

/**
 * Settings tab-list state with roving-tabindex keyboard activation
 * (arrows move between tabs, Home/End jump to first/last), per the ARIA tabs
 * pattern. `activeTab`/`setActiveTab` drive the visible panel; `tabRefs` must be
 * attached to each tab button.
 */
export function useSettingsTabs(initial?: SettingsTab) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initial ?? "goals");
  const tabRefs = useRef<Record<SettingsTab, HTMLButtonElement | null>>({
    goals: null,
    notifications: null,
    categories: null,
    locations: null,
    import: null,
    testdata: null,
  });

  /** Apply a tab read from the URL search params (no-op if absent/invalid). */
  const applySearchParam = (tab: string | null) => {
    if (tab && isSettingsTab(tab)) setActiveTab(tab);
  };

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const idx = SETTINGS_TABS.indexOf(activeTab);
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % SETTINGS_TABS.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = SETTINGS_TABS.length - 1;
    if (nextIdx !== null) {
      e.preventDefault();
      const nextTab = SETTINGS_TABS[nextIdx]!;
      setActiveTab(nextTab);
      tabRefs.current[nextTab]?.focus();
    }
  };

  return {
    activeTab,
    setActiveTab,
    tabRefs,
    applySearchParam,
    onTabKeyDown,
  };
}

/** Display label for a tab (e.g. "testdata" → "Test data"). */
export function tabLabel(tab: SettingsTab): string {
  return tab === "testdata" ? "Test data" : tab;
}
