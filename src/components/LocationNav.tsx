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
    <div className="flex items-center gap-2 min-w-0">
      <label htmlFor="inventory-location-filter" className="text-sm font-medium">Location:</label>
      <select id="inventory-location-filter" value={selectedLocation ?? ""} onChange={e => onSelectLocation(e.target.value || undefined)} className="min-w-0 max-w-48 px-3 py-2 border border-line bg-raised text-ink rounded-[3px] text-sm">
        <option value="">All Locations</option>
        {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
      </select>
    </div>
  );
}
