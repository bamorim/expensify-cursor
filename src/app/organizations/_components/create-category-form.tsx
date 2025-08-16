"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Loader2, Plus } from "lucide-react";

interface CreateCategoryFormProps {
  organizationId: string;
  onSuccess?: () => void;
}

export function CreateCategoryForm({
  organizationId,
  onSuccess,
}: CreateCategoryFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const utils = api.useUtils();

  const createCategory = api.categories.create.useMutation({
    onSuccess: async () => {
      setIsSubmitting(false);
      setName("");
      setDescription("");
      setError(null);

      // Refresh the categories list
      await utils.categories.getAll.invalidate({ organizationId });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Refresh the page to show the new category
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
      await createCategory.mutateAsync({
        organizationId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } catch {
      // Error is handled in onError callback
    }
  };

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-6">
      <div className="mb-6">
        <h2 className="mb-2 flex items-center gap-2 text-2xl font-semibold text-white">
          <Plus className="h-6 w-6" />
          Create New Category
        </h2>
        <p className="text-white/70">
          Add a new expense category for your organization
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-400/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-white"
          >
            Category Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Travel, Meals, Office Supplies"
            maxLength={50}
            required
            disabled={isSubmitting}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:border-[hsl(280,100%,70%)] focus:ring-2 focus:ring-[hsl(280,100%,70%)]/20 focus:outline-none disabled:opacity-50"
          />
          <p className="mt-1 text-sm text-white/50">
            {name.length}/50 characters
          </p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium text-white"
          >
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this category covers"
            maxLength={200}
            disabled={isSubmitting}
            rows={3}
            className="w-full resize-none rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:border-[hsl(280,100%,70%)] focus:ring-2 focus:ring-[hsl(280,100%,70%)]/20 focus:outline-none disabled:opacity-50"
          />
          <p className="mt-1 text-sm text-white/50">
            {description.length}/200 characters
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(280,100%,70%)] px-6 py-3 font-semibold text-black transition hover:bg-[hsl(280,100%,60%)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Create Category
            </>
          )}
        </button>
      </form>
    </div>
  );
}
