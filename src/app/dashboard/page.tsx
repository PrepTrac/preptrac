"use client";

import { api } from "~/utils/api";
import { useEffect } from "react";
import DashboardMetrics from "~/components/DashboardMetrics";
import CategoryGoals from "~/components/CategoryGoals";
import UpcomingEvents from "~/components/UpcomingEvents";
import RecentActivityList from "~/components/RecentActivityList";
import Navigation from "~/components/Navigation";

const SYNC_STORAGE_KEY = "preptrac_events_last_sync";
const SYNC_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export default function DashboardPage() {
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
    if (Date.now() - lastSyncAt >= SYNC_COOLDOWN_MS) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Dashboard
        </h1>
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
      </main>
    </div>
  );
}

