"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "~/utils/api";
import { useForm } from "react-hook-form";
import { Plus, X, Edit, Trash2 } from "lucide-react";
import {
  CATEGORY_KINDS,
  CATEGORY_KIND_LABELS,
  type CategoryKind,
} from "~/utils/inventory";
import ConfirmDialog from "~/components/ConfirmDialog";
import { useDemoMode } from "~/components/DemoModeProvider";

interface CategoryFormData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  kind?: CategoryKind;
  targetQuantity?: number;
}

export default function CategoryForm() {
  const { readOnly } = useDemoMode();
  const { data: categories, isLoading } = api.categories.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const createCategory = api.categories.create.useMutation();
  const updateCategory = api.categories.update.useMutation();
  const deleteCategory = api.categories.delete.useMutation();
  const utils = api.useUtils();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormData>();

  const onSubmit = (data: CategoryFormData) => {
    const submitData = {
      ...data,
      ...(data.kind ? { kind: data.kind } : {}),
      targetQuantity: Number(data.targetQuantity) || 0,
    };

    if (editingId) {
      updateCategory.mutate(
        { id: editingId, ...submitData },
        {
          onSuccess: () => {
            utils.categories.getAll.invalidate();
            reset();
            setEditingId(null);
            setShowForm(false);
          },
        }
      );
    } else {
      createCategory.mutate(submitData, {
        onSuccess: () => {
          utils.categories.getAll.invalidate();
          reset();
          setShowForm(false);
        },
      });
    }
  };

  const handleEdit = (category: RouterOutputs["categories"]["getAll"][number]) => {
    setEditingId(category.id);
    reset({
      name: category.name,
      description: category.description ?? "",
      color: category.color ?? "",
      icon: category.icon ?? "",
      kind: (category.kind as CategoryKind | null | undefined) ?? undefined,
      targetQuantity: category.targetQuantity ?? 0,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteCategory.mutate(
      { id },
      {
        onSuccess: () => {
          utils.categories.getAll.invalidate();
        },
      }
    );
  };

  if (isLoading) {
    return <div>Loading categories...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-ink [overflow-wrap:anywhere]">
          Categories
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
            Add Category
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-surface rounded-[3px]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="categoryform-name" className="block text-sm font-medium text-ink [overflow-wrap:anywhere] mb-1">
                Name *
              </label>
              <input
                id="categoryform-name"
                {...register("name", { required: true })}
                className={`w-full px-3 py-2 border ${errors.name ? "border-danger" : "border-line"} rounded-[3px] bg-raised text-ink`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-danger">Name is required</p>
              )}
            </div>
            <div>
              <label htmlFor="categoryform-description" className="block text-sm font-medium text-ink [overflow-wrap:anywhere] mb-1">
                Description
              </label>
              <input
                id="categoryform-description"
                {...register("description")}
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="categoryform-color" className="block text-sm font-medium text-ink [overflow-wrap:anywhere] mb-1">
                  Color (hex)
                </label>
              <input
                id="categoryform-color"
                  type="color"
                  {...register("color")}
                  className="w-full h-10 border border-line rounded-[3px]"
                />
              </div>
              <div>
                <label htmlFor="categoryform-icon" className="block text-sm font-medium text-ink [overflow-wrap:anywhere] mb-1">
                  Icon Name
                </label>
              <input
                id="categoryform-icon"
                  {...register("icon")}
                  placeholder="e.g., package, droplet"
                  className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
                />
              </div>
            </div>
            <div>
              <label htmlFor="categoryform-kind" className="block text-sm font-medium text-ink [overflow-wrap:anywhere] mb-1">
                Kind
              </label>
              <select
                id="categoryform-kind"
                {...register("kind")}
                defaultValue=""
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
              >
                <option value="">Auto (infer from name)</option>
                {CATEGORY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {CATEGORY_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">
                Controls how this category maps to dashboard goals (ammo, water, food, fuel). Leave on Auto to infer from the name.
              </p>
            </div>
            <div>
              <label htmlFor="categoryform-targetQuantity" className="block text-sm font-medium text-ink [overflow-wrap:anywhere] mb-1">
                Target Quantity (Goal)
              </label>
              <input
                id="categoryform-targetQuantity"
                type="number"
                step="0.01"
                {...register("targetQuantity", { valueAsNumber: true })}
                placeholder="Total quantity goal for this category"
                className="w-full px-3 py-2 border border-line rounded-[3px] bg-raised text-ink"
              />
              <p className="mt-1 text-xs text-muted">
                If set, this will be used as the goal for the entire category.
              </p>
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
        {categories?.map((category) => (
          <div
            key={category.id}
            className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface rounded-[3px]"
          >
            <div className="flex items-center min-w-0 flex-1">
              {category.color && (
                <div
                  className="w-4 h-4 rounded mr-3"
                  style={{ backgroundColor: category.color }}
                />
              )}
              <div>
                <div className="font-medium text-ink [overflow-wrap:anywhere]">
                  {category.name}
                </div>
                {category.description && (
                  <div className="text-sm text-muted [overflow-wrap:anywhere]">
                    {category.description}
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {!readOnly && (
                <button
                  onClick={() => handleEdit(category)}
                  aria-label={`Edit category ${category.name}`}
                  title={`Edit ${category.name}`}
                  className="p-2 text-muted hover:text-muted dark:hover:text-muted rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                >
                  <Edit className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              {!readOnly && (
                <button
                  onClick={() => setPendingDelete(category.id)}
                  aria-label={`Delete category ${category.name}`}
                  title={`Delete ${category.name}`}
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
        title="Delete category"
        message="Are you sure you want to delete this category?"
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

