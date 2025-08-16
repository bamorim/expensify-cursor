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
  organization: {
    id: string;
    name: string;
    description: string | null;
  };
  invitedByUser: {
    name: string | null;
    email: string | null;
  };
}

export function InvitationAcceptance() {
  const [acceptingInvitation, setAcceptingInvitation] = useState<string | null>(null);

  const { data: invitations, refetch } = api.invitations.getMyInvitations.useQuery();
  const acceptInvitation = api.invitations.acceptInvitation.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      alert(error.message || "Failed to accept invitation");
    },
  });

  const handleAcceptInvitation = async (invitationId: string) => {
    setAcceptingInvitation(invitationId);
    try {
      await acceptInvitation.mutateAsync({ invitationId });
    } catch (err) {
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

  const pendingInvitations = invitations.filter(inv => inv.status === "PENDING");

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/10 rounded-xl p-6 border border-white/20 mb-6">
      <h2 className="text-2xl font-semibold mb-4">Pending Invitations</h2>
      
      <div className="space-y-4">
        {pendingInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className={`p-4 rounded-lg border ${
              isExpired(invitation.expiresAt)
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  {invitation.organization.name}
                </h3>
                {invitation.organization.description && (
                  <p className="text-white/70 text-sm mt-1">
                    {invitation.organization.description}
                  </p>
                )}
                <p className="text-white/60 text-sm mt-2">
                  Role: {invitation.role} • Invited by: {invitation.invitedByUser.name || invitation.invitedByUser.email}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  Sent: {new Date(invitation.createdAt).toLocaleDateString()} • {formatExpiryDate(invitation.expiresAt)}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {isExpired(invitation.expiresAt) ? (
                  <span className="px-3 py-2 bg-red-500/20 text-red-300 rounded text-sm">
                    Expired
                  </span>
                ) : (
                  <button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    disabled={acceptInvitation.isPending && acceptingInvitation === invitation.id}
                    className="px-4 py-2 bg-green-500/20 text-green-300 rounded text-sm hover:bg-green-500/30 disabled:opacity-50 transition"
                  >
                    {acceptInvitation.isPending && acceptingInvitation === invitation.id ? "Accepting..." : "Accept Invitation"}
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
