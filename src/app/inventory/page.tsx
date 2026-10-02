"use client";

import { api } from "~/utils/api";
import { useState, useEffect } from "react";
import ItemCard from "~/components/ItemCard";
import ItemTable from "~/components/ItemTable";
import ItemViewToggle, { type ItemView } from "~/components/ItemViewToggle";
import ItemForm from "~/components/ItemForm";
import CategoryNav from "~/components/CategoryNav";
import LocationNav from "~/components/LocationNav";
import { Plus, Search, Filter, Download } from "lucide-react";
import { exportToCSV, exportToJSON } from "~/utils/export";
import { useDemoMode } from "~/components/DemoModeProvider";

const DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debouncedValue;
}

export default function InventoryPage() {
  const { readOnly } = useDemoMode();
  // Table is the default view; users can switch to the denser card grid.
  const [viewMode, setViewMode] = useState<ItemView>("table");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, DEBOUNCE_MS);
  const [showFilters, setShowFilters] = useState(false);
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [lowInventory, setLowInventory] = useState(false);
  const [needsMaintenance, setNeedsMaintenance] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const { data: items, isLoading, isFetching } = api.items.getAll.useQuery({
    categoryId: selectedCategory,
    locationId: selectedLocation,
    search: debouncedSearch || undefined,
    expiringSoon: expiringSoon || undefined,
    lowInventory: lowInventory || undefined,
    needsMaintenance: needsMaintenance || undefined,
  });

  const { data: categories } = api.categories.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const { data: locations } = api.locations.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="page-header">
          <h1 className="text-3xl font-semibold text-ink">
            Inventory
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (items) {
                  exportToCSV(items, `preptrac-inventory-${new Date().toISOString().split('T')[0]}`);
                }
              }}
              className="inline-flex items-center px-3 py-2 border border-line rounded-[3px] text-sm font-medium text-ink bg-raised hover:bg-paper dark:hover:bg-surface"
              title="Export to CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </button>
            <button
              onClick={() => {
                if (items) {
                  exportToJSON(items, `preptrac-inventory-${new Date().toISOString().split('T')[0]}`);
                }
              }}
              className="inline-flex items-center px-3 py-2 border border-line rounded-[3px] text-sm font-medium text-ink bg-raised hover:bg-paper dark:hover:bg-surface"
              title="Export to JSON"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </button>
            {!readOnly && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setShowItemForm(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-[3px] text-sm font-medium text-on-action bg-action hover:bg-action-hover"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3 border-y border-line py-4">
            <div className="flex-1 min-w-[12rem] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden="true" />
              <input type="search" aria-label="Search items" placeholder="Search items…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-line rounded-[3px] bg-raised text-ink placeholder-muted" />
            </div>
            <CategoryNav categories={categories ?? []} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
            <LocationNav locations={locations ?? []} selectedLocation={selectedLocation} onSelectLocation={setSelectedLocation} />
            <ItemViewToggle value={viewMode} onChange={setViewMode} />
            <button onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} className="inline-flex items-center px-3 py-2 border border-line rounded-[3px] text-sm font-medium text-ink hover:bg-surface"><Filter className="h-4 w-4 mr-2" />More filters</button>
          </div>

          {showFilters && (
            <div className="bg-raised p-4 rounded-[3px] ">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="inventory-page-field-1" className="block text-sm font-medium text-ink mb-2">
                    Category
                  </label>
              <select
                id="inventory-page-field-1"
                    value={selectedCategory || ""}
                    onChange={(e) =>
                      setSelectedCategory(e.target.value || undefined)
                    }
                    className="block w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
                  >
                    <option value="">All Categories</option>
                    {categories?.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={expiringSoon}
                    onChange={(e) => setExpiringSoon(e.target.checked)}
                    className="rounded border-line text-action focus:ring-action"
                  />
                  <span className="ml-2 text-sm text-ink">
                    Expiring Soon
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={lowInventory}
                    onChange={(e) => setLowInventory(e.target.checked)}
                    className="rounded border-line text-action focus:ring-action"
                  />
                  <span className="ml-2 text-sm text-ink">
                    Low Inventory
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={needsMaintenance}
                    onChange={(e) => setNeedsMaintenance(e.target.checked)}
                    className="rounded border-line text-action focus:ring-action"
                  />
                  <span className="ml-2 text-sm text-ink">
                    Needs Maintenance
                  </span>
                </label>
              </div>
            </div>
          )}

          {showItemForm && (
            <ItemForm
              itemId={editingItem}
              onClose={() => {
                setShowItemForm(false);
                setEditingItem(null);
              }}
            />
          )}

          {isLoading && items === undefined ? (
            <div className="text-center py-12">
              <p className="text-muted">Loading...</p>
            </div>
          ) : (
            <>
              <div className={`transition-opacity ${isFetching ? "opacity-70" : ""}`}>
                {viewMode === "table" ? (
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
              </div>

              {items?.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted">
                    No items found. Add your first item to get started!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
    </main>
  );
}

