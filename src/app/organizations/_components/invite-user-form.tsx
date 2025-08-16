"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

interface InviteUserFormProps {
  organizationId: string;
  onSuccess?: () => void;
}

export function InviteUserForm({
  organizationId,
  onSuccess,
}: InviteUserFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inviteUser = api.invitations.inviteUser.useMutation({
    onSuccess: () => {
      setSuccess("Invitation sent successfully!");
      setEmail("");
      setRole("MEMBER");
      onSuccess?.();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (error) => {
      setError(error.message || "Failed to send invitation. Please try again.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await inviteUser.mutateAsync({
        organizationId,
        email: email.trim(),
        role,
      });
    } catch {
      // Error is handled by onError callback
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-white"
          >
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:border-[hsl(280,100%,70%)] focus:ring-2 focus:ring-[hsl(280,100%,70%)]/20 focus:outline-none"
            placeholder="Enter email address"
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="mb-2 block text-sm font-medium text-white"
          >
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-[hsl(280,100%,70%)] focus:ring-2 focus:ring-[hsl(280,100%,70%)]/20 focus:outline-none"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg bg-red-400/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-400/10 p-3 text-sm text-green-400">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !email.trim()}
          className="w-full rounded-lg bg-[hsl(280,100%,70%)] px-6 py-3 font-semibold text-black transition hover:bg-[hsl(280,100%,60%)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Send Invitation"}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-white/60">
        <p>Invitations expire in 7 days</p>
      </div>
    </div>
  );
}
