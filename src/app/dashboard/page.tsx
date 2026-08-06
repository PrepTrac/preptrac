"use client";

import { api } from "~/utils/api";
import { useEffect } from "react";
import Link from "next/link";
import { Package, MapPin, Settings as SettingsIcon, Sparkles } from "lucide-react";
import DashboardMetrics from "~/components/DashboardMetrics";
import CategoryGoals from "~/components/CategoryGoals";
import UpcomingEvents from "~/components/UpcomingEvents";
import RecentActivityList from "~/components/RecentActivityList";
import { useDemoMode } from "~/components/DemoModeProvider";

const SYNC_STORAGE_KEY = "preptrac_events_last_sync";
const SYNC_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export default function DashboardPage() {
  const { readOnly } = useDemoMode();
  const utils = api.useUtils();
  const syncFromItems = api.events.syncFromItems.useMutation({
    onSuccess: () => {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(SYNC_STORAGE_KEY, String(Date.now()));
      }
      void utils.dashboard.getStats.invalidate();
    },
  });
  const { data: stats, isLoading } = api.dashboard.getStats.useQuery();

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    const lastSync = sessionStorage.getItem(SYNC_STORAGE_KEY);
    const lastSyncAt = lastSync ? Number(lastSync) : 0;
    if (Date.now() - lastSyncAt >= SYNC_COOLDOWN_MS && !readOnly) {
      void syncFromItems.mutateAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Dashboard
      </h1>
      {stats && stats.totalItems === 0 ? (
          <OnboardingCard />
        ) : (
          <>
            <DashboardMetrics stats={stats} />
            <CategoryGoals
              categoryStats={stats?.categoryStats ?? []}
              ammoBreakdown={stats?.ammoBreakdown}
              foodBreakdown={stats?.foodBreakdown}
              waterBreakdown={stats?.waterBreakdown}
            />
            <UpcomingEvents events={stats?.upcomingEvents ?? []} />
            <div className="mt-10">
              <RecentActivityList
                defaultPageSize={10}
                showTitle={true}
                compact={true}
                activityPageHref="/activity"
              />
            </div>
          </>
      )}
    </main>
  );
}

/** Shown when there is no inventory yet: guides the user to first-run setup. */
function OnboardingCard() {
  const steps = [
    {
      href: "/inventory",
      icon: Package,
      title: "Add your first item",
      body: "Catalog supplies, food, water, ammo, fuel — anything you want to track.",
    },
    {
      href: "/locations",
      icon: MapPin,
      title: "Organize by location",
      body: "Create storage locations (pantry, garage, bug-out bag) to keep things tidy.",
    },
    {
      href: "/settings",
      icon: SettingsIcon,
      title: "Set your preparedness goals",
      body: "Define goals for water, food days, ammo and fuel so the dashboard tracks progress.",
    },
  ];
  return (
    <section
      aria-labelledby="onboarding-title"
      className="rounded-lg border border-blue-100 bg-white p-6 shadow-sm dark:border-blue-900/40 dark:bg-gray-800"
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2
          id="onboarding-title"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Welcome to PrepTrac
        </h2>
      </div>
      <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
        Your inventory is empty. Once you add items and set goals, this dashboard
        will show your preparedness metrics, category progress and upcoming events.
      </p>
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.href}>
              <Link
                href={step.href}
                className="flex h-full flex-col gap-2 rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <span className="text-blue-600 dark:text-blue-400">{i + 1}.</span>
                  <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  {step.title}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {step.body}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

