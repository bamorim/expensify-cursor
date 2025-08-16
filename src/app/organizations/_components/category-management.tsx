"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Loader2,
  Trash2,
  Plus,
  FolderOpen,
  FileText,
  Shield,
} from "lucide-react";
import { CreateCategoryForm } from "./create-category-form";
import { EditCategoryForm } from "./edit-category-form";



interface CategoryManagementProps {
  organizationId: string;
  userRole: "ADMIN" | "MEMBER";
}

export function CategoryManagement({
  organizationId,
  userRole,
}: CategoryManagementProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );

  const utils = api.useUtils();

  const {
    data: categories,
    isLoading,
    error,
  } = api.categories.getAll.useQuery({
    organizationId,
  });

  const deleteCategory = api.categories.delete.useMutation({
    onSuccess: async () => {
      await utils.categories.getAll.invalidate({ organizationId });
    },
  });

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategory.mutateAsync({
        organizationId,
        categoryId,
      });
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleEditSuccess = () => {
    setEditingCategoryId(null);
  };

  const handleEditCancel = () => {
    setEditingCategoryId(null);
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-400/10 p-3 text-sm text-red-400">
        Failed to load categories: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Expense Categories
          </h2>
          <p className="text-white/70">
            Manage expense categories for your organization
          </p>
        </div>

        {userRole === "ADMIN" && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 rounded-lg bg-[hsl(280,100%,70%)] px-4 py-2 font-semibold text-black transition hover:bg-[hsl(280,100%,60%)]"
          >
            <Plus className="h-4 w-4" />
            {showCreateForm ? "Cancel" : "Add Category"}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && userRole === "ADMIN" && (
        <CreateCategoryForm
          organizationId={organizationId}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}

      {/* Categories List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="relative rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="mt-1 text-sm text-white/70">
                        {category.description}
                      </p>
                    )}
                  </div>

                  {userRole === "ADMIN" &&
                    editingCategoryId !== category.id && (
                      <div className="flex items-center gap-1">
                        <EditCategoryForm
                          category={category}
                          onSuccess={handleEditSuccess}
                          onCancel={handleEditCancel}
                        />

                        <button
                          type="button"
                          onClick={() => void handleDelete(category.id)}
                          disabled={
                            category._count.expenses > 0 ||
                            category._count.policies > 0
                          }
                          className="flex h-8 w-8 items-center justify-center rounded bg-white/10 p-0 text-red-400 transition hover:bg-white/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            category._count.expenses > 0 ||
                            category._count.policies > 0
                              ? "Cannot delete category with dependencies"
                              : "Delete category"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                </div>

                {/* Edit Form (when editing) */}
                {editingCategoryId === category.id && userRole === "ADMIN" ? (
                  <EditCategoryForm
                    category={category}
                    onSuccess={handleEditSuccess}
                    onCancel={handleEditCancel}
                  />
                ) : (
                  /* Category Stats */
                  <div className="flex items-center gap-4 text-sm text-white/50">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{category._count.expenses} expenses</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      <span>{category._count.policies} policies</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <FolderOpen className="mb-4 h-12 w-12 text-white/50" />
              <h3 className="mb-2 text-lg font-semibold text-white">
                No categories yet
              </h3>
              <p className="mb-4 text-white/70">
                {userRole === "ADMIN"
                  ? "Create your first expense category to get started with policy management."
                  : "No expense categories have been created yet."}
              </p>
              {userRole === "ADMIN" && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 rounded-lg bg-[hsl(280,100%,70%)] px-4 py-2 font-semibold text-black transition hover:bg-[hsl(280,100%,60%)]"
                >
                  <Plus className="h-4 w-4" />
                  Create First Category
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
