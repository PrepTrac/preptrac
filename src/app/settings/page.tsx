"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CategoryForm from "~/components/CategoryForm";
import LocationForm from "~/components/LocationForm";
import GoalsSection from "~/components/settings/GoalsSection";
import NotificationsSection from "~/components/settings/NotificationsSection";
import ImportSection from "~/components/settings/ImportSection";
import TestDataSection from "~/components/settings/TestDataSection";
import {
  SETTINGS_TABS,
  useSettingsTabs,
  tabLabel,
} from "~/hooks/useSettingsTabs";

/**
 * Settings page. Now a thin shell: tab navigation lives in `useSettingsTabs`,
 * and each tab's content is a self-contained component under
 * `src/components/settings/` (or the shared `CategoryForm`/`LocationForm`).
 */
function SettingsPageContent() {
  const searchParams = useSearchParams();
  const { activeTab, setActiveTab, tabRefs, applySearchParam, onTabKeyDown } =
    useSettingsTabs();

  useEffect(() => {
    if (!searchParams) return;
    applySearchParam(searchParams.get("tab"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Settings
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav
            className="flex -mb-px"
            role="tablist"
            aria-label="Settings sections"
            onKeyDown={onTabKeyDown}
          >
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab}
                ref={(el) => { tabRefs.current[tab] = el; }}
                role="tab"
                id={`tab-${tab}`}
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-6 text-sm font-medium border-b-2 capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {tabLabel(tab)}
              </button>
            ))}
          </nav>
        </div>

        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          className="p-6 focus:outline-none"
        >
          {activeTab === "goals" && <GoalsSection />}
          {activeTab === "notifications" && <NotificationsSection />}
          {activeTab === "categories" && <CategoryForm />}
          {activeTab === "locations" && <LocationForm />}
          {activeTab === "import" && <ImportSection />}
          {activeTab === "testdata" && <TestDataSection />}
        </div>
      </div>
    </main>
  );
}

function SettingsPageFallback() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>
      <p className="text-gray-500 dark:text-gray-400">Loading…</p>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPageContent />
    </Suspense>
  );
}
