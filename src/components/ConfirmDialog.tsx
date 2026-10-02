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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
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
        className="w-full max-w-md rounded-[3px] bg-raised p-6 shadow-xl outline-none bg-raised"
      >
        <h2
          id="confirm-dialog-title"
          className="mb-2 text-lg font-semibold text-ink"
        >
          {title}
        </h2>
        <div className="mb-5 text-sm text-muted text-ink">{message}</div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[3px] border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-action border-line bg-surface text-ink dark:hover:bg-surface"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? "rounded-[3px] border border-transparent px-4 py-2 text-sm font-medium text-on-action bg-danger hover:bg-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                : "rounded-[3px] border border-transparent px-4 py-2 text-sm font-medium text-on-action bg-action hover:bg-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
