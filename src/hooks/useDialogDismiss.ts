import { useEffect, useRef } from "react";

/**
 * Accessible dismiss behavior for modal-style dialogs:
 *  - Closes the dialog when Escape is pressed.
 *  - Moves focus into the dialog when it opens.
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
  onCloseRef.current = onClose;
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
