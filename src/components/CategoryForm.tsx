"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "~/utils/api";
import { useForm } from "react-hook-form";
import { Plus, X, Edit, Trash2 } from "lucide-react";

interface CategoryFormData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  targetQuantity?: number;
}

export default function CategoryForm() {
  const { data: categories, isLoading } = api.categories.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const createCategory = api.categories.create.useMutation();
  const updateCategory = api.categories.update.useMutation();
  const deleteCategory = api.categories.delete.useMutation();
  const utils = api.useUtils();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormData>();

  const onSubmit = (data: CategoryFormData) => {
    const submitData = {
      ...data,
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
      targetQuantity: category.targetQuantity ?? 0,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteCategory.mutate(
        { id },
        {
          onSuccess: () => {
            utils.categories.getAll.invalidate();
          },
        }
      );
    }
  };

  if (isLoading) {
    return <div>Loading categories...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Categories
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
          Add Category
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
                className={`w-full px-3 py-2 border ${errors.name ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">Name is required</p>
              )}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color (hex)
                </label>
                <input
                  type="color"
                  {...register("color")}
                  className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Icon Name
                </label>
                <input
                  {...register("icon")}
                  placeholder="e.g., package, droplet"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Quantity (Goal)
              </label>
              <input
                type="number"
                step="0.01"
                {...register("targetQuantity", { valueAsNumber: true })}
                placeholder="Total quantity goal for this category"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500">
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
        {categories?.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center">
              {category.color && (
                <div
                  className="w-4 h-4 rounded mr-3"
                  style={{ backgroundColor: category.color }}
                />
              )}
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {category.name}
                </div>
                {category.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {category.description}
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleEdit(category)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(category.id)}
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

