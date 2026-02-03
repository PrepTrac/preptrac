"use client";

import type { RouterOutputs } from "~/utils/api";

type Location = RouterOutputs["locations"]["getAll"][0];

interface LocationNavProps {
  locations: Location[];
  selectedLocation?: string;
  onSelectLocation: (locationId: string | undefined) => void;
}

export default function LocationNav({
  locations,
  selectedLocation,
  onSelectLocation,
}: LocationNavProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectLocation(undefined)}
        className={`px-4 py-2 rounded-md text-sm font-medium ${
          !selectedLocation
            ? "bg-green-600 text-white"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        All Locations
      </button>
      {locations.map((location) => (
        <button
          key={location.id}
          onClick={() =>
            onSelectLocation(
              selectedLocation === location.id ? undefined : location.id
            )
          }
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            selectedLocation === location.id
              ? "bg-green-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          {location.name}
        </button>
      ))}
    </div>
  );
}

