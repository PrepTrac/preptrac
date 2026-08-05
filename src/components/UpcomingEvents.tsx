"use client";

import { format } from "date-fns";
import { Calendar } from "lucide-react";
import type { RouterOutputs } from "~/utils/api";
import { getEventBadgeClass, getEventLabel } from "~/utils/eventStyles";

type Event = RouterOutputs["events"]["getAll"][0];

interface UpcomingEventsProps {
  events: Event[];
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Upcoming Events
        </h2>
        <p className="text-gray-500 dark:text-gray-400">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Upcoming Events
        </h2>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {events.map((event) => (
          <li key={event.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {event.title}
                  </p>
                  {event.item && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {event.item.name} - {event.item.location.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventBadgeClass(
                    event.type
                  )}`}
                >
                  {getEventLabel(event.type)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(event.date), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

