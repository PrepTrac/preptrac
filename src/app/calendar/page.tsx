"use client";

import { api } from "~/utils/api";
import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getEventBadgeClass,
  getEventSwatchClass,
  getEventLabel,
  type EventType,
} from "~/utils/eventStyles";
import { useDemoMode } from "~/components/DemoModeProvider";

const SYNC_STORAGE_KEY = "preptrac_events_last_sync";
const SYNC_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export default function CalendarPage() {
  const { readOnly } = useDemoMode();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  const utils = api.useUtils();
  const syncFromItems = api.events.syncFromItems.useMutation({
    onSuccess: () => {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(SYNC_STORAGE_KEY, String(Date.now()));
      }
      void utils.events.getAll.invalidate();
    },
  });

  const { data: events, isLoading } = api.events.getAll.useQuery(
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
  );

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

  const getEventsForDay = (day: Date) => {
    return events?.filter((event) => isSameDay(new Date(event.date), day)) ?? [];
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get the first day of the month's weekday
  const firstDayOfWeek = startDate.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="page-header">
          <h1 className="text-3xl font-semibold text-ink">
            Calendar
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={previousMonth}
              aria-label="Previous month"
              className="p-2 rounded-[3px] text-muted hover:text-muted dark:hover:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <h2 className="text-xl font-semibold text-ink">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="p-2 rounded-[3px] text-muted hover:text-muted dark:hover:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="border-t border-line overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line">
            {weekDays.map((day) => (
              <div
                key={day}
                className="px-0.5 sm:px-4 py-3 text-center text-sm font-medium text-ink bg-surface"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[80px] sm:min-h-[100px] border-r border-b border-line" />
            ))}
            {daysInMonth.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] sm:min-h-[100px] border-r border-b border-line p-1 sm:p-2 overflow-hidden ${
                    isToday ? "bg-selected" : ""
                  }`}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday
                        ? "text-action"
                        : "text-ink"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <ul className="space-y-1 list-none p-0 m-0">
                    {dayEvents.slice(0, 3).map((event) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          aria-label={`${getEventLabel(event.type)}: ${event.title} on ${format(day, "MMMM d, yyyy")}`}
                          title={event.title}
                          className={`w-full text-left text-xs px-2 py-1 rounded truncate block focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${getEventBadgeClass(
                          event.type
                        )}`}
                      >
                        {event.title}
                      </button>
                      </li>
                    ))}
                    {dayEvents.length > 3 && (
                      <li className="text-xs text-muted">
                        +{dayEvents.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 border-t border-line py-6">
          <h3 className="text-lg font-medium text-ink mb-4">
            Event Legend
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(["expiration", "maintenance", "rotation", "battery_replacement"] as EventType[]).map((type) => (
              <div key={type} className="flex items-center">
                <div className={`w-4 h-4 rounded mr-2 ${getEventSwatchClass(type)}`} />
                <span className="text-sm text-ink capitalize">
                  {getEventLabel(type)}
                </span>
              </div>
            ))}
          </div>
        </div>
    </main>
  );
}

