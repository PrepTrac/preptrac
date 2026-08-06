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
      <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Disclaimer:</strong> This test data tool is only for visualizing the
          capability of this web app. It is not intended for production use or for
          tracking real preparedness inventory.
        </p>
      </div>
      {readOnly ? (
        <p className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
          This instance is running in demo mode and is already seeded with sample data. The fill/remove tools are disabled because demo mode is read-only.
        </p>
      ) : (
        <>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-500" />
            Fill test data
          </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Add a sample preparedness inventory so you can see how the app looks with data.
        Creates categories, locations, items (food, water, ammo, medical, shelter, etc.),
        some consumption history over the last 6 months, and upcoming expiration/maintenance
        events. Safe to run multiple times — existing categories and locations are reused.
      </p>
      <FillTestDataButton />
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <Trash2 className="h-5 w-5 text-red-500" />
          Remove test data
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Removes only data that was added by &ldquo;Fill test data&rdquo;. Your real
          categories, locations, and items are never touched.
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
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
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FlaskConical className="h-4 w-4 mr-2" />
        {fillTestData.isPending ? "Adding test data…" : "Fill test data"}
      </button>
      {fillTestData.isSuccess && fillTestData.data && (
        <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm space-y-1">
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
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
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
        className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-700 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
        {removeTestData.isPending ? "Removing…" : "Remove test data"}
      </button>
      {!testDataStatus?.hasTestData && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No test data to remove. Use &ldquo;Fill test data&rdquo; first.
        </p>
      )}
      {removeTestData.isSuccess && removeTestData.data && (
        <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm">
          {removeTestData.data.message}
        </div>
      )}
      {removeTestData.isError && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
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
