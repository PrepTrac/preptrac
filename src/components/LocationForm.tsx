"use client";

import { useState } from "react";
import { api } from "~/utils/api";
import { useForm } from "react-hook-form";
import { Plus, Edit, Trash2 } from "lucide-react";

interface LocationFormData {
  name: string;
  description?: string;
}

export default function LocationForm() {
  const { data: locations, isLoading } = api.locations.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const createLocation = api.locations.create.useMutation();
  const updateLocation = api.locations.update.useMutation();
  const deleteLocation = api.locations.delete.useMutation();
  const utils = api.useUtils();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset } = useForm<LocationFormData>();

  const onSubmit = (data: LocationFormData) => {
    if (editingId) {
      updateLocation.mutate(
        { id: editingId, ...data },
        {
          onSuccess: () => {
            utils.locations.getAll.invalidate();
            reset();
            setEditingId(null);
            setShowForm(false);
          },
        }
      );
    } else {
      createLocation.mutate(data, {
        onSuccess: () => {
          utils.locations.getAll.invalidate();
          reset();
          setShowForm(false);
        },
      });
    }
  };

  const handleEdit = (location: any) => {
    setEditingId(location.id);
    reset({
      name: location.name,
      description: location.description ?? "",
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this location?")) {
      deleteLocation.mutate(
        { id },
        {
          onSuccess: () => {
            utils.locations.getAll.invalidate();
          },
        }
      );
    }
  };

  if (isLoading) {
    return <div>Loading locations...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Locations
        </h3>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setShowForm(true);
          }}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                {...register("name", { required: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                {...register("description")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  reset();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {locations?.map((location) => (
          <div
            key={location.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {location.name}
              </div>
              {location.description && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {location.description}
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleEdit(location)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(location.id)}
                className="p-2 text-red-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

