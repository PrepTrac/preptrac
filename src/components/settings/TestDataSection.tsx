"use client";

import { useState } from "react";
import { api } from "~/utils/api";
import ConfirmDialog from "~/components/ConfirmDialog";
import { FlaskConical, Trash2 } from "lucide-react";
import { useDemoMode } from "~/components/DemoModeProvider";

/** Invalidate every query that test data affects (add + remove both use this). */
function invalidateTestData(utils: ReturnType<typeof api.useUtils>) {
  void utils.settings.hasTestData.invalidate();
  void utils.items.getAll.invalidate();
  void utils.categories.getAll.invalidate();
  void utils.locations.getAll.invalidate();
  void utils.events.getAll.invalidate();
  void utils.dashboard.getStats.invalidate();
  void utils.items.getConsumptionStats.invalidate();
  void utils.items.getRecentConsumption.invalidate();
  void utils.items.getRecentActivity.invalidate();
  void utils.locations.getConsumptionByLocation.invalidate();
  void utils.household.getAll.invalidate();
  void utils.household.getTotalDailyCalories.invalidate();
}

/**
 * Test-data tools (Settings → Test data): fill a sample inventory and remove it.
 * Extracted from the settings page so the page is a thin shell over its tabs.
 */
export default function TestDataSection() {
  const { readOnly } = useDemoMode();
  return (
    <div className="space-y-6">
      <div className="p-3 rounded-[3px] bg-caution-soft border border-caution">
        <p className="text-sm text-caution">
          <strong>Disclaimer:</strong> This test data tool is only for visualizing the
          capability of this web app. It is not intended for production use or for
          tracking real preparedness inventory.
        </p>
      </div>
      {readOnly ? (
        <p className="rounded-[3px] bg-caution-soft border border-caution p-3 text-sm text-caution">
          This instance is running in demo mode and is already seeded with sample data. The fill/remove tools are disabled because demo mode is read-only.
        </p>
      ) : (
        <>
          <h3 className="text-lg font-medium text-ink flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-caution" />
            Fill test data
          </h3>
      <p className="text-sm text-muted">
        Add a sample preparedness inventory so you can see how the app looks with data.
        Creates categories, locations, items (food, water, ammo, medical, shelter, etc.),
        some consumption history over the last 6 months, and upcoming expiration/maintenance
        events. Safe to run multiple times — existing categories and locations are reused.
      </p>
      <FillTestDataButton />
      <div className="border-t border-line pt-6 mt-6">
        <h3 className="text-lg font-medium text-ink flex items-center gap-2 mb-2">
          <Trash2 className="h-5 w-5 text-danger" />
          Remove test data
        </h3>
        <p className="text-sm text-muted mb-3">
          Removes only data that was added by &ldquo;Fill test data&rdquo;. Your real
          categories, locations, and items are never touched.
        </p>
        <p className="text-sm text-caution mb-3">
          If you have been modifying or tracking your preps using the data populated by
          this app and you click Remove test data, all of that will be removed.
        </p>
        <RemoveTestDataButton />
      </div>
        </>
      )}
    </div>
  );
}

function FillTestDataButton() {
  const utils = api.useUtils();
  const fillTestData = api.settings.fillTestData.useMutation({
    onSuccess: () => invalidateTestData(utils),
  });

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => fillTestData.mutate()}
        disabled={fillTestData.isPending}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-[3px] text-sm font-medium text-on-action bg-caution hover:bg-caution focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-caution disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FlaskConical className="h-4 w-4 mr-2" />
        {fillTestData.isPending ? "Adding test data…" : "Fill test data"}
      </button>
      {fillTestData.isSuccess && fillTestData.data && (
        <div className="p-3 rounded-[3px] bg-success-soft text-action text-sm space-y-1">
          <p>
            Done. Created {fillTestData.data.categories} categories, {fillTestData.data.locations}{" "}
            locations, {fillTestData.data.items} items, and{" "}
            {fillTestData.data.consumptionLogs} consumption + {fillTestData.data.additionLogs ?? 0} addition activity log entries.
          </p>
          {fillTestData.data.familyMembers != null && fillTestData.data.familyMembers > 0 && (
            <p>Added {fillTestData.data.familyMembers} household members (2 parents, 2 kids) so &ldquo;Days of Food&rdquo; and water days use your household profile.</p>
          )}
          {fillTestData.data.activityLevelSet && (
            <p>Set activity level to <strong>Moderate</strong> so Days of Food and food goals use it (change in Household).</p>
          )}
          {fillTestData.data.goalsSet && (
            <p>Set inventory goals (Ammo 1500 rounds, Water 30 gal, Food 90 days, Fuel 20 gal / 100 kWh / 50 kWh battery) in Settings → Goals so the dashboard Category Progress shows goal-based progress.</p>
          )}
        </div>
      )}
      {fillTestData.isError && (
        <div className="p-3 rounded-[3px] bg-danger-soft text-danger text-sm">
          {fillTestData.error.message}
        </div>
      )}
    </div>
  );
}

function RemoveTestDataButton() {
  const utils = api.useUtils();
  const { data: testDataStatus } = api.settings.hasTestData.useQuery();
  const removeTestData = api.settings.removeTestData.useMutation({
    onSuccess: () => invalidateTestData(utils),
  });
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setConfirmRemove(true)}
        disabled={removeTestData.isPending || !testDataStatus?.hasTestData}
        className="inline-flex items-center px-4 py-2 border border-danger rounded-[3px] text-sm font-medium text-danger bg-raised hover:bg-danger-soft dark:hover:bg-danger-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-danger disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
        {removeTestData.isPending ? "Removing…" : "Remove test data"}
      </button>
      {!testDataStatus?.hasTestData && (
        <p className="text-sm text-muted">
          No test data to remove. Use &ldquo;Fill test data&rdquo; first.
        </p>
      )}
      {removeTestData.isSuccess && removeTestData.data && (
        <div className="p-3 rounded-[3px] bg-success-soft text-action text-sm">
          {removeTestData.data.message}
        </div>
      )}
      {removeTestData.isError && (
        <div className="p-3 rounded-[3px] bg-danger-soft text-danger text-sm">
          {removeTestData.error.message}
        </div>
      )}
      <ConfirmDialog
        open={confirmRemove}
        title="Remove test data"
        message="Remove only the data that was added by “Fill test data”? Your real preps will not be changed."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          removeTestData.mutate();
          setConfirmRemove(false);
        }}
        onClose={() => setConfirmRemove(false)}
      />
    </div>
  );
}
