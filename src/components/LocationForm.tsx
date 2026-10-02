"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "~/utils/api";
import { useForm } from "react-hook-form";
import { Plus, Edit, Trash2 } from "lucide-react";
import ConfirmDialog from "~/components/ConfirmDialog";
import { useDemoMode } from "~/components/DemoModeProvider";

interface LocationFormData {
  name: string;
  description?: string;
}

export default function LocationForm() {
  const { readOnly } = useDemoMode();
  const { data: locations, isLoading } = api.locations.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const createLocation = api.locations.create.useMutation();
  const updateLocation = api.locations.update.useMutation();
  const deleteLocation = api.locations.delete.useMutation();
  const utils = api.useUtils();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LocationFormData>();

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

  const handleEdit = (location: RouterOutputs["locations"]["getAll"][number]) => {
    setEditingId(location.id);
    reset({
      name: location.name,
      description: location.description ?? "",
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteLocation.mutate(
      { id },
      {
        onSuccess: () => {
          utils.locations.getAll.invalidate();
        },
      }
    );
  };

  if (isLoading) {
    return <div>Loading locations...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-ink [overflow-wrap:anywhere]">
          Locations
        </h3>
        {!readOnly && (
          <button
            onClick={() => {
              setEditingId(null);
              reset();
              setShowForm(true);
            }}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-[3px] text-on-action bg-action hover:bg-action-hover"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-surface rounded-[3px]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="locationform-name" className="block text-sm font-medium text-ink [overflow-wrap:anywhere] mb-1">
                Name *
              </label>
              <input
                id="locationform-name"
                {...register("name", { required: true })}
                className={`w-full px-3 py-2 border ${errors.name ? "border-danger" : "border-line"} rounded-[3px] bg-raised text-ink`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-danger">Name is required</p>
              )}
            </div>
            <div>
              <label htmlFor="locationform-description" className="block text-sm font-medium text-ink [overflow-wrap:anywhere] mb-1">
                Description
              </label>
              <input
                id="locationform-description"
                {...register("description")}
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
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
                className="px-4 py-2 border border-line rounded-[3px] text-sm font-medium text-ink [overflow-wrap:anywhere] bg-raised"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={readOnly}
                className="px-4 py-2 border border-transparent rounded-[3px] text-sm font-medium text-on-action bg-action hover:bg-action-hover disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface rounded-[3px]"
          >
            <div>
              <div className="font-medium text-ink [overflow-wrap:anywhere]">
                {location.name}
              </div>
              {location.description && (
                <div className="text-sm text-muted [overflow-wrap:anywhere]">
                  {location.description}
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              {!readOnly && (
                <button
                  onClick={() => handleEdit(location)}
                  aria-label={`Edit location ${location.name}`}
                  title={`Edit ${location.name}`}
                  className="p-2 text-muted hover:text-muted dark:hover:text-muted rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                >
                  <Edit className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              {!readOnly && (
                <button
                  onClick={() => setPendingDelete(location.id)}
                  aria-label={`Delete location ${location.name}`}
                  title={`Delete ${location.name}`}
                  className="p-2 text-danger hover:text-danger rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete location"
        message="Are you sure you want to delete this location?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) handleDelete(pendingDelete);
          setPendingDelete(null);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

