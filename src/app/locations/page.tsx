"use client";

import { api } from "~/utils/api";
import { useState } from "react";
import ItemCard from "~/components/ItemCard";
import ItemTable from "~/components/ItemTable";
import ItemViewToggle, { type ItemView } from "~/components/ItemViewToggle";
import ItemForm from "~/components/ItemForm";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { useDemoMode } from "~/components/DemoModeProvider";

export default function LocationsPage() {
  const { readOnly } = useDemoMode();
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  // Table is the default view for the items list, matching the Inventory page.
  const [viewMode, setViewMode] = useState<ItemView>("table");

  const { data: locations, isLoading: locationsLoading } = api.locations.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  // Resolve the active location: keep an explicit selection when it still
  // exists, otherwise default to the first location. Defaulting here means the
  // page shows real data immediately on load instead of a blank screen with an
  // unselected dropdown. (Derived rather than useEffect-set so there is no
  // empty first paint or extra render cycle.)
  const activeLocationId =
    selectedLocationId && locations?.some((l) => l.id === selectedLocationId)
      ? selectedLocationId
      : locations?.[0]?.id;

  const { data: items, isLoading: itemsLoading } = api.items.getAll.useQuery(
    { locationId: activeLocationId ?? undefined },
    { enabled: !!activeLocationId }
  );
  const { data: consumption, isLoading: consumptionLoading } =
    api.locations.getConsumptionByLocation.useQuery(
      { locationId: activeLocationId ?? "", limit: 50 },
      { enabled: !!activeLocationId }
    );

  const selectedLocation = locations?.find((l) => l.id === activeLocationId);

  if (locationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-semibold text-ink flex items-center gap-2 mb-6">
          Locations
        </h1>
        <p className="text-muted mb-6">
          Select a location to see what you have stored there and activity (consumption or additions) from it.
        </p>

        {/* Location selector — hidden when there are no locations; the empty
            state below handles that case instead of showing an empty dropdown. */}
        {(locations?.length ?? 0) > 0 && (
        <div className="mb-8">
          <label htmlFor="active-storage-location" className="block text-sm font-medium text-ink [overflow-wrap:anywhere] mb-2">
            Select location
          </label>
          <div className="relative max-w-md">
            <select
              id="active-storage-location"
              value={activeLocationId ?? ""}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="block w-full max-w-md px-4 py-3 pr-10 border border-line rounded-[3px] bg-raised text-ink appearance-none focus:ring-2 focus:ring-action focus:border-action"
            >
              {locations?.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted pointer-events-none" />
          </div>
        </div>
        )}

        {locations?.length === 0 && (
          <div className="bg-raised rounded-[3px] p-8 text-center">
            <p className="text-muted">
              No locations yet. Add locations in Settings, then assign items to them from Inventory.
            </p>
            <a
              href="/settings"
              className="mt-4 inline-block text-action hover:underline"
            >
              Go to Settings →
            </a>
          </div>
        )}

        {activeLocationId && selectedLocation && (
          <>
            {/* Location header */}
            <div className="open-section py-6 mb-8">
              <h2 className="text-xl font-semibold text-ink [overflow-wrap:anywhere] flex items-center gap-2">
                {selectedLocation.name}
              </h2>
              {selectedLocation.description && (
                <p className="mt-2 text-muted [overflow-wrap:anywhere]">
                  {selectedLocation.description}
                </p>
              )}
            </div>

            {/* Items at this location */}
            <section className="mb-10">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                  Items at this location
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <ItemViewToggle value={viewMode} onChange={setViewMode} />
                  {!readOnly && <button
                    onClick={() => {
                      setEditingItem(null);
                      setShowItemForm(true);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-[3px] text-sm font-medium text-on-action bg-action hover:bg-action-hover"
                  >
                    Add item here
                  </button>}
                </div>
              </div>

              {itemsLoading ? (
                <div className="text-muted py-8">Loading items...</div>
              ) : items?.length === 0 ? (
                <div className="bg-raised rounded-[3px] p-8 text-center">
                  <p className="text-muted">
                    No items at this location. Add items from Inventory and assign them to this
                    location, or use &ldquo;Add item here&rdquo; above.
                  </p>
                  <a
                    href="/inventory"
                    className="mt-4 inline-block text-action hover:underline"
                  >
                    Go to Inventory →
                  </a>
                </div>
              ) : viewMode === "table" ? (
                <ItemTable
                  items={items ?? []}
                  onEdit={(id) => {
                    setEditingItem(id);
                    setShowItemForm(true);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items?.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={() => {
                        setEditingItem(item.id);
                        setShowItemForm(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* from this location */}
            <section>
              <h3 className="text-lg font-semibold text-ink flex items-center gap-2 mb-4">
                Activity from this location
              </h3>

              {consumptionLoading ? (
                <div className="text-muted py-8">Loading activity...</div>
              ) : consumption?.length === 0 ? (
                <div className="bg-raised rounded-[3px] p-8 text-center">
                  <p className="text-muted">
                    No consumption or additions recorded from this location yet.
                  </p>
                </div>
              ) : (
                <div className="bg-raised rounded-[3px] overflow-hidden">
                  <ul className="divide-y divide-line">
                    {consumption?.map((log) => (
                      <li
                        key={log.id}
                        className="px-4 py-3 flex flex-wrap items-baseline justify-between gap-2"
                      >
                        <div>
                          <span className="font-medium text-ink [overflow-wrap:anywhere]">
                            {log.item.name}
                          </span>
                          <span className="text-muted ml-2">
                            {log.quantity} {log.item.unit}
                          </span>
                          <span
                            className={`ml-2 text-xs font-medium px-2 py-0.5 rounded ${
                              log.type === "addition"
                                ? "bg-success-soft text-action bg-success-soft text-action"
                                : "bg-danger-soft text-danger bg-danger-soft text-danger"
                            }`}
                          >
                            {log.type === "addition" ? "Added" : "Used"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted">
                          {log.note && (
                            <span className="italic">&ldquo;{log.note}&rdquo;</span>
                          )}
                          <time dateTime={new Date(log.createdAt).toISOString()}>
                            {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}

        {showItemForm && (
          <ItemForm
            itemId={editingItem}
            defaultLocationId={activeLocationId}
            onClose={() => {
              setShowItemForm(false);
              setEditingItem(null);
            }}
          />
        )}
    </main>
  );
}
