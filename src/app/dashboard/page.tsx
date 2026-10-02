"use client";

import { api } from "~/utils/api";
import { useEffect } from "react";
import Link from "next/link";
import DashboardMetrics from "~/components/DashboardMetrics";
import CategoryGoals from "~/components/CategoryGoals";
import AttentionList from "~/components/AttentionList";
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
  const { data: stats, isLoading, isError } = api.dashboard.getStats.useQuery();
  const { data: goals, isError: goalsError } = api.settings.getGoals.useQuery();
  const { data: household } = api.household.getAll.useQuery();
  const { data: locations, isLoading: locationsLoading, isError: locationsError } = api.locations.getAll.useQuery();
  const { data: lowItems, isLoading: lowLoading, isError: lowError } = api.items.getAll.useQuery({ lowInventory: true });

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

  if (isError || !stats) return <main className="page-shell"><h1 className="text-3xl font-semibold mb-6">Dashboard</h1><p role="alert" className="text-danger">Unable to load preparedness metrics. Please try again.</p></main>;

  return (
    <main className="page-shell">
      <header className="page-header">
        <div><p className="index-label mb-2">PREPTRAC / READINESS INDEX</p><h1 className="text-3xl font-semibold">Dashboard</h1></div>
        <Link href="/household" className="text-sm text-muted hover:text-action">{household ? `${household.length} household member${household.length === 1 ? "" : "s"}` : "Household profile"} →</Link>
      </header>
      {stats.totalItems === 0 ? <OnboardingCard /> : <>
        {goalsError && <p role="alert" className="text-danger text-sm mb-4">Goals could not load. Coverage still shows recorded supply estimates.</p>}
        <DashboardMetrics stats={stats} goals={goals} />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8 mb-10">
          <AttentionList stats={stats} lowItems={lowItems} loading={lowLoading} error={lowError} />
          <section aria-labelledby="storage-heading" className="min-w-0">
            <div className="section-heading"><h2 id="storage-heading">Storage locations</h2><Link href="/locations" className="text-xs text-action hover:underline">View all →</Link></div>
            {locationsLoading ? <p className="text-muted">Loading locations…</p> : locationsError ? <p role="alert" className="text-danger">Locations could not load.</p> : locations?.length ? <ul className="divide-y divide-line">{locations.map((location, i) => <li key={location.id} className="py-3"><Link href="/locations" className="flex gap-3 hover:text-action"><span className="index-label pt-0.5">{String(i + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block font-medium [overflow-wrap:anywhere]">{location.name}</span>{location.description && <span className="block text-xs text-muted mt-1 [overflow-wrap:anywhere]">{location.description}</span>}</span></Link></li>)}</ul> : <p className="text-sm text-muted">No storage locations recorded.</p>}
          </section>
        </div>
        <CategoryGoals categoryStats={stats.categoryStats} ammoBreakdown={stats.ammoBreakdown} foodBreakdown={stats.foodBreakdown} waterBreakdown={stats.waterBreakdown} />
        <div className="mt-10"><RecentActivityList defaultPageSize={10} showTitle compact activityPageHref="/activity" /></div>
      </>}
    </main>
  );
}

function OnboardingCard() {
  return <section aria-labelledby="onboarding-title" className="open-section py-6">
    <h2 id="onboarding-title" className="text-xl font-semibold mb-2">Build your readiness picture</h2>
    <p className="text-muted mb-6">Your inventory is empty. Start with your household, record supplies and storage, then set goals.</p>
    <ol className="divide-y divide-line">
      <li className="py-4 flex gap-4"><span className="index-label">01</span><div><Link href="/household" className="font-medium text-action hover:underline">Set up your household →</Link><p className="text-sm text-muted mt-1">Add members to estimate daily food and water needs.</p></div></li>
      <li className="py-4 flex gap-4"><span className="index-label">02</span><div><Link href="/inventory" className="font-medium text-action hover:underline">Record your supplies →</Link><p className="text-sm text-muted mt-1">Add food, water, fuel and other essentials. <Link href="/settings?tab=locations" className="text-action hover:underline">Set up storage locations</Link> and assign supplies to them.</p></div></li>
      <li className="py-4 flex gap-4"><span className="index-label">03</span><div><Link href="/settings?tab=goals" className="font-medium text-action hover:underline">Set preparedness goals →</Link><p className="text-sm text-muted mt-1">Choose food days, water gallons, ammunition and energy targets.</p></div></li>
    </ol>
  </section>;
}
