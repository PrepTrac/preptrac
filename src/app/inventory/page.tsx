"use client";

import { api } from "~/utils/api";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "~/components/Navigation";
import ItemCard from "~/components/ItemCard";
import ItemForm from "~/components/ItemForm";
import CategoryNav from "~/components/CategoryNav";
import LocationNav from "~/components/LocationNav";
import { Plus, Search, Filter, Download } from "lucide-react";
import { exportToCSV, exportToJSON } from "~/utils/export";

export default function InventoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [lowInventory, setLowInventory] = useState(false);
  const [needsMaintenance, setNeedsMaintenance] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const { data: items, isLoading } = api.items.getAll.useQuery({
    categoryId: selectedCategory,
    locationId: selectedLocation,
    search: searchQuery || undefined,
    expiringSoon: expiringSoon || undefined,
    lowInventory: lowInventory || undefined,
    needsMaintenance: needsMaintenance || undefined,
  });

  const { data: categories } = api.categories.getAll.useQuery();
  const { data: locations } = api.locations.getAll.useQuery();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Inventory
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                if (items) {
                  exportToCSV(items, `preptrac-inventory-${new Date().toISOString().split('T')[0]}`);
                }
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
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
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Export to JSON"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setShowItemForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <CategoryNav
            categories={categories ?? []}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
          <LocationNav
            locations={locations ?? []}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory || ""}
                    onChange={(e) =>
                      setSelectedCategory(e.target.value || undefined)
                    }
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Expiring Soon
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={lowInventory}
                    onChange={(e) => setLowInventory(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Low Inventory
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={needsMaintenance}
                    onChange={(e) => setNeedsMaintenance(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
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

          {items?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No items found. Add your first item to get started!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

