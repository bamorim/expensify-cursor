"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Loader2, Save, X, Edit3 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
}

interface EditCategoryFormProps {
  category: Category;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditCategoryForm({
  category,
  onSuccess,
  onCancel,
}: EditCategoryFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const utils = api.useUtils();

  const updateCategory = api.categories.update.useMutation({
    onSuccess: async () => {
      setIsSubmitting(false);
      setIsEditing(false);
      setError(null);

      // Refresh the categories list
      await utils.categories.getAll.invalidate({
        organizationId: category.organizationId,
      });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Refresh the page to show the updated category
      router.refresh();
    },
    onError: (error) => {
      setIsSubmitting(false);
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Category name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateCategory.mutateAsync({
        organizationId: category.organizationId,
        categoryId: category.id,
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } catch {
      // Error is handled in onError callback
    }
  };

  const handleCancel = () => {
    setName(category.name);
    setDescription(category.description ?? "");
    setError(null);
    setIsEditing(false);
    if (onCancel) {
      onCancel();
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="flex h-8 w-8 items-center justify-center rounded bg-white/10 p-0 text-white/70 transition hover:bg-white/20 hover:text-white"
        >
          <Edit3 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-400/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor={`name-${category.id}`}
          className="mb-2 block text-sm font-medium text-white"
        >
          Category Name *
        </label>
        <input
          id={`name-${category.id}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
          disabled={isSubmitting}
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-[hsl(280,100%,70%)] focus:ring-2 focus:ring-[hsl(280,100%,70%)]/20 focus:outline-none disabled:opacity-50"
        />
        <p className="mt-1 text-sm text-white/50">
          {name.length}/50 characters
        </p>
      </div>

      <div>
        <label
          htmlFor={`description-${category.id}`}
          className="mb-2 block text-sm font-medium text-white"
        >
          Description (Optional)
        </label>
        <textarea
          id={`description-${category.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          disabled={isSubmitting}
          rows={2}
          className="w-full resize-none rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-[hsl(280,100%,70%)] focus:ring-2 focus:ring-[hsl(280,100%,70%)]/20 focus:outline-none disabled:opacity-50"
        />
        <p className="mt-1 text-sm text-white/50">
          {description.length}/200 characters
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="flex items-center gap-2 rounded bg-[hsl(280,100%,70%)] px-3 py-2 text-sm font-medium text-black hover:bg-[hsl(280,100%,60%)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3 w-3" />
              Save
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-50"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </form>
  );
}
