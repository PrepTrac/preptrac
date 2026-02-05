"use client";

import { api } from "~/utils/api";
import { useEffect, useState } from "react";
import Navigation from "~/components/Navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  const utils = api.useUtils();
  const syncFromItems = api.events.syncFromItems.useMutation({
    onSuccess: () => {
      void utils.events.getAll.invalidate();
    },
  });

  const { data: events, isLoading } = api.events.getAll.useQuery(
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    {
      // Sync events from items on first load (backfills existing inventory)
      refetchOnMount: "always",
    }
  );

  // Sync events from items when calendar loads (backfills existing inventory)
  useEffect(() => {
    void syncFromItems.mutateAsync();
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

  const getEventColor = (type: string) => {
    switch (type) {
      case "expiration":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "rotation":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "battery_replacement":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Calendar
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={previousMonth}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ChevronRight className="h-5 w-5" />
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
                  className={`min-h-[100px] border-r border-b border-gray-200 dark:border-gray-700 p-2 ${
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
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs px-2 py-1 rounded truncate ${getEventColor(
                          event.type
                        )}`}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
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
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900 rounded mr-2" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Expiration
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900 rounded mr-2" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Maintenance
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded mr-2" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Rotation
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900 rounded mr-2" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Battery Replacement
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

