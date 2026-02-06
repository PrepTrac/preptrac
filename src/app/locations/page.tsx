"use client";

import { api } from "~/utils/api";
import { useState } from "react";
import Navigation from "~/components/Navigation";
import ItemCard from "~/components/ItemCard";
import ItemForm from "~/components/ItemForm";
import { MapPin, Package, History, Edit, ChevronDown } from "lucide-react";
import { format } from "date-fns";

export default function LocationsPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const { data: locations, isLoading: locationsLoading } = api.locations.getAll.useQuery();
  const { data: items, isLoading: itemsLoading } = api.items.getAll.useQuery(
    { locationId: selectedLocationId ?? undefined },
    { enabled: !!selectedLocationId }
  );
  const { data: consumption, isLoading: consumptionLoading } =
    api.locations.getConsumptionByLocation.useQuery(
      { locationId: selectedLocationId!, limit: 50 },
      { enabled: !!selectedLocationId }
    );

  const selectedLocation = locations?.find((l) => l.id === selectedLocationId);

  if (locationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
          <MapPin className="h-8 w-8 text-emerald-500" />
          Locations
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Select a location to see what you have stored there and activity (consumption or additions) from it.
        </p>

        {/* Location selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select location
          </label>
          <div className="relative">
            <select
              value={selectedLocationId ?? ""}
              onChange={(e) => setSelectedLocationId(e.target.value || undefined)}
              className="block w-full max-w-md px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Choose a location...</option>
              {locations?.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {!selectedLocationId && locations?.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No locations yet. Add locations in Settings, then assign items to them from Inventory.
            </p>
            <a
              href="/settings"
              className="mt-4 inline-block text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Go to Settings →
            </a>
          </div>
        )}

        {selectedLocationId && selectedLocation && (
          <>
            {/* Location header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-500" />
                {selectedLocation.name}
              </h2>
              {selectedLocation.description && (
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {selectedLocation.description}
                </p>
              )}
            </div>

            {/* Items at this location */}
            <section className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-500" />
                  Items at this location
                </h3>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setShowItemForm(true);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Add item here
                </button>
              </div>

              {itemsLoading ? (
                <div className="text-gray-500 dark:text-gray-400 py-8">Loading items...</div>
              ) : items?.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    No items at this location. Add items from Inventory and assign them to this
                    location, or use &ldquo;Add item here&rdquo; above.
                  </p>
                  <a
                    href="/inventory"
                    className="mt-4 inline-block text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Go to Inventory →
                  </a>
                </div>
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

            {/* Activity from this location */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-amber-500" />
                Activity from this location
              </h3>

              {consumptionLoading ? (
                <div className="text-gray-500 dark:text-gray-400 py-8">Loading activity...</div>
              ) : consumption?.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    No consumption or additions recorded from this location yet.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {consumption?.map((log) => (
                      <li
                        key={log.id}
                        className="px-4 py-3 flex flex-wrap items-baseline justify-between gap-2"
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {log.item.name}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            {log.quantity} {log.item.unit}
                          </span>
                          <span
                            className={`ml-2 text-xs font-medium px-2 py-0.5 rounded ${
                              log.type === "addition"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            }`}
                          >
                            {log.type === "addition" ? "Added" : "Used"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
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
            defaultLocationId={selectedLocationId}
            onClose={() => {
              setShowItemForm(false);
              setEditingItem(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
