"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function InvitationAcceptance() {
  const [acceptingInvitation, setAcceptingInvitation] = useState<string | null>(
    null,
  );

  const { data: invitations, refetch } =
    api.invitations.getMyInvitations.useQuery();
  const acceptInvitation = api.invitations.acceptInvitation.useMutation({
    onSuccess: async () => {
      await refetch();
    },
    onError: (error) => {
      alert(error.message || "Failed to accept invitation");
    },
  });

  const handleAcceptInvitation = async (invitationId: string) => {
    setAcceptingInvitation(invitationId);
    try {
      await acceptInvitation.mutateAsync({ invitationId });
    } catch {
      // Error is handled by onError callback
    } finally {
      setAcceptingInvitation(null);
    }
  };

  const isExpired = (expiresAt: Date) => {
    return expiresAt < new Date();
  };

  const formatExpiryDate = (expiresAt: Date) => {
    const date = expiresAt;
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Expired";
    if (diffDays === 1) return "Expires tomorrow";
    return `Expires in ${diffDays} days`;
  };

  if (!invitations || invitations.length === 0) {
    return null; // Don't render anything if no invitations
  }

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "PENDING",
  );

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-white/20 bg-white/10 p-6">
      <h2 className="mb-4 text-2xl font-semibold">Pending Invitations</h2>

      <div className="space-y-4">
        {pendingInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className={`rounded-lg border p-4 ${
              isExpired(invitation.expiresAt)
                ? "border-red-500/20 bg-red-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  {invitation.organization.name}
                </h3>
                {invitation.organization.description && (
                  <p className="mt-1 text-sm text-white/70">
                    {invitation.organization.description}
                  </p>
                )}
                <p className="mt-2 text-sm text-white/60">
                  Role: {invitation.role} • Invited by:{" "}
                  {invitation.invitedByUser.name ??
                    invitation.invitedByUser.email}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  Sent: {new Date(invitation.createdAt).toLocaleDateString()} •{" "}
                  {formatExpiryDate(invitation.expiresAt)}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {isExpired(invitation.expiresAt) ? (
                  <span className="rounded bg-red-500/20 px-3 py-2 text-sm text-red-300">
                    Expired
                  </span>
                ) : (
                  <button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    disabled={
                      acceptInvitation.isPending &&
                      acceptingInvitation === invitation.id
                    }
                    className="rounded bg-green-500/20 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/30 disabled:opacity-50"
                  >
                    {acceptInvitation.isPending &&
                    acceptingInvitation === invitation.id
                      ? "Accepting..."
                      : "Accept Invitation"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
