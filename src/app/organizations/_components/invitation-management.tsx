"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

interface Invitation {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  expiresAt: Date;
  createdAt: Date;
  invitedByUser: {
    name: string | null;
    email: string | null;
  };
}

interface InvitationManagementProps {
  organizationId: string;
  invitations: Invitation[];
  onInvitationUpdate: () => void;
}

export function InvitationManagement({
  organizationId,
  invitations,
  onInvitationUpdate,
}: InvitationManagementProps) {
  const [cancellingInvitation, setCancellingInvitation] = useState<
    string | null
  >(null);

  const cancelInvitation = api.invitations.cancelInvitation.useMutation({
    onSuccess: () => {
      onInvitationUpdate();
    },
    onError: (error) => {
      alert(error.message || "Failed to cancel invitation");
    },
  });

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) {
      return;
    }

    setCancellingInvitation(invitationId);
    try {
      await cancelInvitation.mutateAsync({ organizationId, invitationId });
    } catch {
      // Error is handled by onError callback
    } finally {
      setCancellingInvitation(null);
    }
  };

  const isExpired = (expiresAt: Date) => {
    return expiresAt < new Date();
  };

  const formatExpiryDate = (expiresAt: Date) => {
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Expired";
    if (diffDays === 1) return "Expires tomorrow";
    return `Expires in ${diffDays} days`;
  };

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "PENDING",
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Pending Invitations</h3>

      {pendingInvitations.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-white/60">No pending invitations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className={`rounded-lg border p-4 ${
                isExpired(invitation.expiresAt)
                  ? "border-red-500/20 bg-red-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {invitation.email}
                      </p>
                      <p className="text-sm text-white/70">
                        Role: {invitation.role} • Invited by:{" "}
                        {invitation.invitedByUser.name ??
                          invitation.invitedByUser.email}
                      </p>
                      <p className="text-xs text-white/50">
                        Sent: {invitation.createdAt.toLocaleDateString()} •{" "}
                        {formatExpiryDate(invitation.expiresAt)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        invitation.role === "ADMIN"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-green-500/20 text-green-300"
                      }`}
                    >
                      {invitation.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isExpired(invitation.expiresAt) && (
                    <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300">
                      Expired
                    </span>
                  )}

                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    disabled={
                      cancelInvitation.isPending &&
                      cancellingInvitation === invitation.id
                    }
                    className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {cancelInvitation.isPending &&
                    cancellingInvitation === invitation.id
                      ? "Cancelling..."
                      : "Cancel"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
