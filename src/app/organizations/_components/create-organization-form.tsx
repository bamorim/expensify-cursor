"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function CreateOrganizationForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const createOrganization = api.organizations.create.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (error) => {
      setError(
        error.message || "Failed to create organization. Please try again.",
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await createOrganization.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } catch {
      // Error is handled by onError callback
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-white"
          >
            Organization Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:border-[hsl(280,100%,70%)] focus:ring-2 focus:ring-[hsl(280,100%,70%)]/20 focus:outline-none"
            placeholder="Enter organization name"
          />
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
            rows={3}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:border-[hsl(280,100%,70%)] focus:ring-2 focus:ring-[hsl(280,100%,70%)]/20 focus:outline-none"
            placeholder="Describe your organization"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-400/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="w-full rounded-lg bg-[hsl(280,100%,70%)] px-6 py-3 font-semibold text-black transition hover:bg-[hsl(280,100%,60%)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Organization"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/60">
        <p>{"You'll automatically become an admin of your new organization"}</p>
      </div>
    </div>
  );
}
