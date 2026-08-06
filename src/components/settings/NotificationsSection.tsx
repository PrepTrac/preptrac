"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api, type RouterInputs } from "~/utils/api";
import {
  DEFAULT_EXPIRATION_DAYS,
  DEFAULT_MAINTENANCE_DAYS,
  DEFAULT_ROTATION_DAYS,
} from "~/utils/notificationDefaults";
import { useDemoMode } from "~/components/DemoModeProvider";

/**
 * Notification preferences editor (Settings → Notifications): email/SMTP,
 * in-app, and webhook delivery settings. Self-contained: owns its queries,
 * mutations, and test-delivery actions.
 */
export default function NotificationsSection() {
  const { readOnly } = useDemoMode();
  const { data: notificationSettings } = api.notifications.getSettings.useQuery();
  const updateSettings = api.notifications.updateSettings.useMutation();
  const sendTestWebhook = api.notifications.sendTestWebhook.useMutation();
  const sendTestEmail = api.notifications.sendTestEmail.useMutation();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      emailEnabled: false,
      emailExpirationDays: DEFAULT_EXPIRATION_DAYS,
      emailMaintenanceDays: DEFAULT_MAINTENANCE_DAYS,
      emailRotationDays: DEFAULT_ROTATION_DAYS,
      emailLowInventory: true,
      inAppEnabled: true,
      webhookEnabled: false,
      webhookUrl: "",
      webhookSecret: "",
      webhookExpirationDays: DEFAULT_EXPIRATION_DAYS,
      webhookMaintenanceDays: DEFAULT_MAINTENANCE_DAYS,
      webhookRotationDays: DEFAULT_ROTATION_DAYS,
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
  const [testWebhookStatus, setTestWebhookStatus] = useState<{ success: boolean; message?: string } | null>(null);
  const [testEmailStatus, setTestEmailStatus] = useState<{ success: boolean; message?: string } | null>(null);

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
        webhookExpirationDays: notificationSettings.webhookExpirationDays ?? DEFAULT_EXPIRATION_DAYS,
        webhookMaintenanceDays: notificationSettings.webhookMaintenanceDays ?? DEFAULT_MAINTENANCE_DAYS,
        webhookRotationDays: notificationSettings.webhookRotationDays ?? DEFAULT_ROTATION_DAYS,
        webhookLowInventory: notificationSettings.webhookLowInventory ?? true,
        smtpHost: notificationSettings.smtpHost ?? "",
        smtpPort: notificationSettings.smtpPort ?? 587,
        smtpUser: notificationSettings.smtpUser ?? "",
        smtpPassword: notificationSettings.smtpPassword ?? "",
        smtpFrom: notificationSettings.smtpFrom ?? "",
      });
    }
  }, [notificationSettings, reset]);

  const onSubmit = (data: RouterInputs["notifications"]["updateSettings"]) => {
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
    } catch (error: unknown) {
      setTestWebhookStatus({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send test webhook",
      });
    }
  };

  const handleTestEmail = async () => {
    setTestEmailStatus(null);
    try {
      const result = await sendTestEmail.mutateAsync();
      setTestEmailStatus({ success: true, message: result.message });
    } catch (error: unknown) {
      setTestEmailStatus({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send test email",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {readOnly && (
        <p className="mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
          Demo mode is read-only — notification settings cannot be changed and test deliveries are disabled.
        </p>
      )}
      {/* fieldset[disabled] turns off every input, test button, and Save at once */}
      <fieldset disabled={readOnly} className="space-y-6">
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
                  disabled={sendTestEmail.isPending}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {sendTestEmail.isPending ? "Sending..." : "Send Test Email"}
                </button>
                {testEmailStatus && (
                  <div className={`mt-2 p-3 rounded-md text-sm ${testEmailStatus.success ? "bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200"}`}>
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
                    required: webhookEnabled ? "Webhook URL is required when notifications are enabled." : false,
                  })}
                  placeholder="https://example.com/webhook"
                  className={`w-full px-3 py-2 border ${errors.webhookUrl ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                />
                {errors.webhookUrl && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.webhookUrl.message}</p>
                )}
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
                  {...register("webhookExpirationDays", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notify Before Maintenance (days)
                </label>
                <input
                  type="number"
                  {...register("webhookMaintenanceDays", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notify Before Rotation (days)
                </label>
                <input
                  type="number"
                  {...register("webhookRotationDays", { valueAsNumber: true })}
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
                  disabled={sendTestWebhook.isPending}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {sendTestWebhook.isPending ? "Sending..." : "Send Test Webhook"}
                </button>
                {testWebhookStatus && (
                  <div className={`mt-2 p-3 rounded-md text-sm ${testWebhookStatus.success ? "bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200"}`}>
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
      </fieldset>
    </form>
  );
}
