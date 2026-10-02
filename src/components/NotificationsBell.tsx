"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, Wrench, RefreshCw, PackageX, CalendarClock } from "lucide-react";
import { api } from "~/utils/api";

const TYPE_META: Record<
  string,
  { icon: typeof AlertTriangle; label: string; color: string }
> = {
  expiration: { icon: AlertTriangle, label: "Expiration", color: "text-danger" },
  maintenance: { icon: Wrench, label: "Maintenance", color: "text-caution" },
  rotation: { icon: RefreshCw, label: "Rotation", color: "text-action" },
  low_inventory: { icon: PackageX, label: "Low inventory", color: "text-caution" },
  battery_replacement: { icon: AlertTriangle, label: "Battery", color: "text-caution" },
};

const DEFAULT_META = { icon: CalendarClock, label: "Upcoming", color: "text-muted" };

/**
 * Accessible in-app notifications bell. Surfaces the live set of pending alerts
 * (expiration, maintenance, rotation, low-inventory and upcoming events) computed
 * by `notifications.getPendingNotifications`. Renders a badge count and a
 * focusable dropdown panel; keyboard users can open it and read each alert.
 */
export default function NotificationsBell({
  align = "right",
  onSidebar = false,
  onMobile = false,
}: {
  align?: "left" | "right";
  onSidebar?: boolean;
  onMobile?: boolean;
}) {
  const { data: notifications = [] } = api.notifications.getPendingNotifications.useQuery(
    undefined,
    { refetchInterval: 5 * 60 * 1000 },
  );
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const count = notifications.length;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative p-2 rounded-[3px] ${onSidebar ? "sidebar-control" : "text-muted hover:bg-surface"}`}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-[3px] bg-danger text-on-action text-[11px] font-bold leading-none"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Pending notifications"
          className={`sidebar-popover ${onMobile ? "fixed inset-x-4 bottom-28" : `absolute bottom-full mb-2 ${align === "left" ? "left-0" : "right-0"} w-80 max-w-[calc(100vw-2rem)]`} bg-raised rounded-[3px] shadow-lg border border-line z-50 max-h-96 overflow-y-auto`}
        >
          <div className="px-4 py-3 border-b border-line">
            <h2 className="text-sm font-semibold text-ink">
              Notifications {count > 0 && <span className="text-muted font-normal">({count})</span>}
            </h2>
          </div>
          {count === 0 ? (
            <p className="px-4 py-6 text-sm text-muted text-center">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {notifications.map((n, i) => {
                const meta = TYPE_META[n.type] ?? DEFAULT_META;
                const Icon = meta.icon;
                return (
                  <li key={`${n.itemId ?? n.type}-${i}`} className="px-4 py-3 flex gap-3">
                    <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${meta.color}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm text-ink [overflow-wrap:anywhere]">{n.message}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="sr-only">Type: </span>
                        {meta.label} · {new Date(n.date).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
