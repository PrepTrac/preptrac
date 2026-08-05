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

const SYNC_STORAGE_KEY = "preptrac_events_last_sync";
const SYNC_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export default function CalendarPage() {
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
    if (Date.now() - lastSyncAt >= SYNC_COOLDOWN_MS) {
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
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Calendar
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={previousMonth}
              aria-label="Previous month"
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {weekDays.map((day) => (
              <div
                key={day}
                className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[100px] border-r border-b border-gray-200 dark:border-gray-700" />
            ))}
            {daysInMonth.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] border-r border-b border-gray-200 dark:border-gray-700 p-2 overflow-hidden ${
                    isToday ? "bg-blue-50 dark:bg-blue-900" : ""
                  }`}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday
                        ? "text-blue-600 dark:text-blue-300"
                        : "text-gray-900 dark:text-white"
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
                          className={`w-full text-left text-xs px-2 py-1 rounded truncate block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${getEventBadgeClass(
                          event.type
                        )}`}
                      >
                        {event.title}
                      </button>
                      </li>
                    ))}
                    {dayEvents.length > 3 && (
                      <li className="text-xs text-gray-500 dark:text-gray-400">
                        +{dayEvents.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Event Legend
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(["expiration", "maintenance", "rotation", "battery_replacement"] as EventType[]).map((type) => (
              <div key={type} className="flex items-center">
                <div className={`w-4 h-4 rounded mr-2 ${getEventSwatchClass(type)}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {getEventLabel(type)}
                </span>
              </div>
            ))}
          </div>
        </div>
    </main>
  );
}

