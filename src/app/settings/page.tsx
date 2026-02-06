"use client";

import { api } from "~/utils/api";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navigation from "~/components/Navigation";
import { useForm } from "react-hook-form";
import CategoryForm from "~/components/CategoryForm";
import LocationForm from "~/components/LocationForm";
import { FlaskConical, Trash2, Download, Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { downloadCSVTemplate } from "~/utils/export";

const SETTINGS_TABS = ["notifications", "categories", "locations", "import", "testdata"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

function isSettingsTab(t: string): t is SettingsTab {
  return SETTINGS_TABS.includes(t as SettingsTab);
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>("notifications");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && isSettingsTab(tab)) setActiveTab(tab);
  }, [searchParams]);

  const { data: notificationSettings } = api.notifications.getSettings.useQuery();
  const updateSettings = api.notifications.updateSettings.useMutation();
  const sendTestWebhook = api.notifications.sendTestWebhook.useMutation();
  const sendTestEmail = api.notifications.sendTestEmail.useMutation();
  const importFromCSV = api.items.importFromCSV.useMutation({
    onSuccess: (data) => setImportResult(data),
    onError: (err) => setImportResult({ created: 0, errors: [{ row: 0, message: err.message }] }),
  });
  const [importResult, setImportResult] = useState<{
    created: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [testWebhookStatus, setTestWebhookStatus] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);
  const [testEmailStatus, setTestEmailStatus] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      emailEnabled: false,
      emailExpirationDays: 7,
      emailMaintenanceDays: 3,
      emailRotationDays: 1,
      emailLowInventory: true,
      inAppEnabled: true,
      webhookEnabled: false,
      webhookUrl: "",
      webhookSecret: "",
      webhookExpirationDays: 7,
      webhookMaintenanceDays: 3,
      webhookRotationDays: 1,
      webhookLowInventory: true,
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      smtpFrom: "",
    },
  });

  const webhookEnabled = watch("webhookEnabled");
  const emailEnabled = watch("emailEnabled");

  useEffect(() => {
    if (notificationSettings) {
      reset({
        emailEnabled: notificationSettings.emailEnabled,
        emailExpirationDays: notificationSettings.emailExpirationDays,
        emailMaintenanceDays: notificationSettings.emailMaintenanceDays,
        emailRotationDays: notificationSettings.emailRotationDays,
        emailLowInventory: notificationSettings.emailLowInventory,
        inAppEnabled: notificationSettings.inAppEnabled,
        webhookEnabled: notificationSettings.webhookEnabled ?? false,
        webhookUrl: notificationSettings.webhookUrl ?? "",
        webhookSecret: notificationSettings.webhookSecret ?? "",
        webhookExpirationDays: notificationSettings.webhookExpirationDays ?? 7,
        webhookMaintenanceDays: notificationSettings.webhookMaintenanceDays ?? 3,
        webhookRotationDays: notificationSettings.webhookRotationDays ?? 1,
        webhookLowInventory: notificationSettings.webhookLowInventory ?? true,
        smtpHost: notificationSettings.smtpHost ?? "",
        smtpPort: notificationSettings.smtpPort ?? 587,
        smtpUser: notificationSettings.smtpUser ?? "",
        smtpPassword: notificationSettings.smtpPassword ?? "",
        smtpFrom: notificationSettings.smtpFrom ?? "",
      });
    }
  }, [notificationSettings, reset]);

  const onSubmit = (data: any) => {
    updateSettings.mutate(data, {
      onSuccess: () => {
        setTestWebhookStatus(null);
      },
    });
  };

  const handleTestWebhook = async () => {
    setTestWebhookStatus(null);
    try {
      const result = await sendTestWebhook.mutateAsync();
      setTestWebhookStatus({ success: true, message: result.message });
    } catch (error: any) {
      setTestWebhookStatus({
        success: false,
        message: error.message || "Failed to send test webhook",
      });
    }
  };

  const handleTestEmail = async () => {
    setTestEmailStatus(null);
    try {
      const result = await sendTestEmail.mutateAsync();
      setTestEmailStatus({ success: true, message: result.message });
    } catch (error: any) {
      setTestEmailStatus({
        success: false,
        message: error.message || "Failed to send test email",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Settings
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("notifications")}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === "notifications"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Notifications
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === "categories"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveTab("locations")}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === "locations"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Locations
              </button>
              <button
                onClick={() => setActiveTab("import")}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === "import"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Import
              </button>
              <button
                onClick={() => setActiveTab("testdata")}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === "testdata"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Test data
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "notifications" && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Notification Preferences
                  </h3>

                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register("emailEnabled")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Enable Email Notifications
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register("inAppEnabled")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Enable In-App Notifications
                      </span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notify Before Expiration (days)
                      </label>
                      <input
                        type="number"
                        {...register("emailExpirationDays", { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notify Before Maintenance (days)
                      </label>
                      <input
                        type="number"
                        {...register("emailMaintenanceDays", { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notify Before Rotation (days)
                      </label>
                      <input
                        type="number"
                        {...register("emailRotationDays", { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register("emailLowInventory")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Notify on Low Inventory
                      </span>
                    </label>

                    {emailEnabled && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                          SMTP Settings (Overrides .env)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              SMTP Host
                            </label>
                            <input
                              id="smtpHost"
                              type="text"
                              {...register("smtpHost")}
                              placeholder="smtp.example.com"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              SMTP Port
                            </label>
                            <input
                              id="smtpPort"
                              type="number"
                              {...register("smtpPort", { valueAsNumber: true })}
                              placeholder="587"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              SMTP User
                            </label>
                            <input
                              id="smtpUser"
                              type="text"
                              {...register("smtpUser")}
                              placeholder="user@example.com"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label htmlFor="smtpPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              SMTP Password
                            </label>
                            <input
                              id="smtpPassword"
                              type="password"
                              {...register("smtpPassword")}
                              placeholder="••••••••"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label htmlFor="smtpFrom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              SMTP From Address
                            </label>
                            <input
                              id="smtpFrom"
                              type="email"
                              {...register("smtpFrom")}
                              placeholder="noreply@example.com"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={handleTestEmail}
                            disabled={sendTestEmail.isLoading}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                          >
                            {sendTestEmail.isLoading
                              ? "Sending..."
                              : "Send Test Email"}
                          </button>
                          {testEmailStatus && (
                            <div
                              className={`mt-2 p-3 rounded-md text-sm ${
                                testEmailStatus.success
                                  ? "bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200"
                                  : "bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200"
                              }`}
                            >
                              {testEmailStatus.message}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Webhook Notifications
                  </h3>

                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register("webhookEnabled")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Enable Webhook Notifications
                      </span>
                    </label>

                    {webhookEnabled && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Webhook URL *
                          </label>
                          <input
                            type="url"
                            {...register("webhookUrl", {
                              required: webhookEnabled,
                            })}
                            placeholder="https://example.com/webhook"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Your webhook endpoint URL
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Webhook Secret (optional)
                          </label>
                          <input
                            type="password"
                            {...register("webhookSecret")}
                            placeholder="Secret for signing webhooks"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Optional secret for HMAC-SHA256 signature verification
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notify Before Expiration (days)
                          </label>
                          <input
                            type="number"
                            {...register("webhookExpirationDays", {
                              valueAsNumber: true,
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notify Before Maintenance (days)
                          </label>
                          <input
                            type="number"
                            {...register("webhookMaintenanceDays", {
                              valueAsNumber: true,
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notify Before Rotation (days)
                          </label>
                          <input
                            type="number"
                            {...register("webhookRotationDays", {
                              valueAsNumber: true,
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...register("webhookLowInventory")}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Notify on Low Inventory
                          </span>
                        </label>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={handleTestWebhook}
                            disabled={sendTestWebhook.isLoading}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                          >
                            {sendTestWebhook.isLoading
                              ? "Sending..."
                              : "Send Test Webhook"}
                          </button>
                          {testWebhookStatus && (
                            <div
                              className={`mt-2 p-3 rounded-md text-sm ${
                                testWebhookStatus.success
                                  ? "bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200"
                                  : "bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200"
                              }`}
                            >
                              {testWebhookStatus.message}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            )}

            {activeTab === "categories" && <CategoryForm />}
            {activeTab === "locations" && <LocationForm />}

            {activeTab === "import" && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Import inventory from CSV
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Download the template, fill in your items (name, unit, category, and location are required), then upload the CSV here.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => downloadCSVTemplate()}
                    className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download template
                  </button>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImportResult(null);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const text = ev.target?.result;
                        if (typeof text === "string") importFromCSV.mutate({ csvContent: text });
                      };
                      reader.readAsText(file, "UTF-8");
                      e.target.value = "";
                    }}
                    className="hidden"
                    aria-label="Choose CSV file"
                  />
                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    disabled={importFromCSV.isPending}
                    className="inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    {importFromCSV.isPending ? "Importing…" : "Upload CSV"}
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
                  Use the same category and location names as in Settings. You can also use categoryId and locationId from an export.
                </p>
                {importResult && (
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <p className="font-medium text-gray-900 dark:text-white mb-2">
                      {importResult.created} item{importResult.created !== 1 ? "s" : ""} created.
                    </p>
                    {importResult.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4" />
                          Row errors
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc list-inside">
                          {importResult.errors.map((e, i) => (
                            <li key={i}>
                              Row {e.row}: {e.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "testdata" && (
              <div className="space-y-6">
                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Disclaimer:</strong> This test data tool is only for visualizing the
                    capability of this web app. It is not intended for production use or for
                    tracking real preparedness inventory.
                  </p>
                </div>
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
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FillTestDataButton() {
  const utils = api.useUtils();
  const fillTestData = api.settings.fillTestData.useMutation({
    onSuccess: () => {
      void utils.settings.hasTestData.invalidate();
      void utils.items.getAll.invalidate();
      void utils.categories.getAll.invalidate();
      void utils.locations.getAll.invalidate();
      void utils.events.getUpcoming.invalidate();
      void utils.dashboard.getStats.invalidate();
      void utils.items.getConsumptionStats.invalidate();
      void utils.items.getRecentConsumption.invalidate();
      void utils.locations.getConsumptionByLocation.invalidate();
      void utils.household.getAll.invalidate();
      void utils.household.getTotalDailyCalories.invalidate();
    },
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
        <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm">
          Done. Created {fillTestData.data.categories} categories, {fillTestData.data.locations}{" "}
          locations, {fillTestData.data.items} items, and {fillTestData.data.consumptionLogs}{" "}
          consumption log entries.
          {fillTestData.data.familyMembers != null && fillTestData.data.familyMembers > 0 && (
            <> Also added {fillTestData.data.familyMembers} household members so &ldquo;Days of Food&rdquo; uses your household profile.</>
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
    onSuccess: () => {
      void utils.settings.hasTestData.invalidate();
      void utils.items.getAll.invalidate();
      void utils.categories.getAll.invalidate();
      void utils.locations.getAll.invalidate();
      void utils.events.getUpcoming.invalidate();
      void utils.dashboard.getStats.invalidate();
      void utils.items.getConsumptionStats.invalidate();
      void utils.items.getRecentConsumption.invalidate();
      void utils.locations.getConsumptionByLocation.invalidate();
      void utils.household.getAll.invalidate();
      void utils.household.getTotalDailyCalories.invalidate();
    },
  });

  const handleRemove = () => {
    if (
      !window.confirm(
        "Remove only the data that was added by \"Fill test data\"? Your real preps will not be changed."
      )
    ) {
      return;
    }
    removeTestData.mutate();
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleRemove}
        disabled={removeTestData.isPending || !testDataStatus?.hasTestData}
        className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-700 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="h-4 w-4 mr-2" />
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
    </div>
  );
}

