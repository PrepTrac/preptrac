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
      <div className="bg-raised rounded-[3px] p-6">
        <h2 className="text-lg font-medium text-ink mb-4">
          Upcoming Events
        </h2>
        <p className="text-muted">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="bg-raised rounded-[3px]">
      <div className="px-6 py-4 border-b border-line">
        <h2 className="text-lg font-medium text-ink">
          Upcoming Events
        </h2>
      </div>
      <ul className="divide-y divide-line">
        {events.map((event) => (
          <li key={event.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-muted mr-3" />
                <div>
                  <p className="text-sm font-medium text-ink">
                    {event.title}
                  </p>
                  {event.item && (
                    <p className="text-sm text-muted">
                      {event.item.name} - {event.item.location.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium ${getEventBadgeClass(
                    event.type
                  )}`}
                >
                  {getEventLabel(event.type)}
                </span>
                <span className="text-sm text-muted">
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

