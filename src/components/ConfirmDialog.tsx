"use client";

import { useDialogDismiss } from "~/hooks/useDialogDismiss";
import { type ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  /** When true, renders the confirm button in a destructive (red) style. */
  destructive?: boolean;
}

/**
 * Accessible, reusable confirmation dialog that replaces native `window.confirm()`.
 *
 * Why not `window.confirm()`: it blocks the event loop (breaks Testing Library
 * async patterns), cannot be styled, is not keyboard-focus-trapped, and renders
 * inconsistently across browsers. This component is a real modal:
 *  - `role="dialog" aria-modal="true"` with a descriptive `aria-labelledby`.
 *  - Focus is moved to the cancel button on open and trapped (Tab/Shift+Tab
 *    cycle within the dialog) via `useDialogDismiss`.
 *  - Escape closes (cancels). Outside-overlay click closes (cancels).
 *  - Focus returns to the triggering element on close.
 *
 * Callers drive it with a "pending action id" pattern:
 *   const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
 *   <ConfirmDialog open={pendingDeleteId !== null} ... onConfirm={() => { remove(pendingDeleteId); setPendingDeleteId(null); }} onClose={() => setPendingDeleteId(null)} />
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  destructive = false,
}: ConfirmDialogProps) {
  const panelRef = useDialogDismiss(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl outline-none dark:bg-gray-800"
      >
        <h2
          id="confirm-dialog-title"
          className="mb-2 text-lg font-semibold text-gray-900 dark:text-white"
        >
          {title}
        </h2>
        <div className="mb-5 text-sm text-gray-600 dark:text-gray-300">{message}</div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? "rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                : "rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
