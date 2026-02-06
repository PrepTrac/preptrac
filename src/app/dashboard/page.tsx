"use client";

import { api } from "~/utils/api";
import { useEffect } from "react";
import DashboardMetrics from "~/components/DashboardMetrics";
import CategoryGoals from "~/components/CategoryGoals";
import UpcomingEvents from "~/components/UpcomingEvents";
import Navigation from "~/components/Navigation";

export default function DashboardPage() {
  const utils = api.useUtils();
  const syncFromItems = api.events.syncFromItems.useMutation({
    onSuccess: () => {
      void utils.dashboard.getStats.invalidate();
    },
  });
  const { data: stats, isLoading } = api.dashboard.getStats.useQuery();

  useEffect(() => {
    void syncFromItems.mutateAsync();
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
      </main>
    </div>
  );
}

