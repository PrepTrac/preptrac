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
      <h1 className="text-3xl font-semibold text-ink mb-8">
        Settings
      </h1>

      <div className="open-section ">
        <div className="border-b border-line">
          <nav
            className="flex flex-wrap -mb-px"
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
                className={`py-3 px-3 sm:px-5 text-sm font-medium border-b-2 capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                  activeTab === tab
                    ? "border-action text-action"
                    : "border-transparent text-muted hover:text-ink hover:border-line text-muted dark:hover:text-muted"
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
          className="py-6 focus-visible:outline-2"
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
      <h1 className="text-3xl font-semibold text-ink mb-8">Settings</h1>
      <p className="text-muted">Loading…</p>
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
