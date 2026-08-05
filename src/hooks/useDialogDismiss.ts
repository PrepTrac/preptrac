import { useEffect, useRef } from "react";

/**
 * Selector matching elements that are keyboard focusable within a dialog.
 * Used by the focus trap to cycle Tab/Shift+Tab among interactive descendants.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dismiss + focus-trap behavior for modal-style dialogs:
 *  - Closes the dialog when Escape is pressed.
 *  - Moves focus into the dialog when it opens.
 *  - **Traps Tab/Shift+Tab** so focus cycles among the dialog's focusable
 *    descendants and cannot escape to the page behind it.
 *  - Restores focus to the element that had focus before the dialog opened
 *    (typically the trigger button) when it closes.
 *
 * The caller must render the returned `panelRef` on a container marked with
 * `role="dialog" aria-modal="true"` (and a descriptive `aria-label`).
 *
 * `onClose` is read through a ref so callers do not need to memoize it.
 *
 * Works for both always-mounted dialogs controlled by `open`
 * (e.g. the mobile nav drawer) and conditionally-rendered dialogs where the
 * component mounts open and unmounts on close (e.g. ItemForm). In the latter
 * case pass `open` as `true`.
 */
export function useDialogDismiss(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      (document.activeElement as HTMLElement | null) ?? null;

    // Defer focus until after the dialog is painted so the ref is attached.
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? panel).focus();
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      // Focus trap: keep Tab cycling within the dialog so focus cannot leak to
      // the background page while a modal is open.
      if (event.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusable.length === 0) {
          event.preventDefault();
          panel.focus();
          return;
        }
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey) {
          if (active === first || !panel.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !panel.contains(active)) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  return panelRef;
}
