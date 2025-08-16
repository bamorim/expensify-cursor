"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { InviteUserForm } from "../_components/invite-user-form";
import { MemberManagement } from "../_components/member-management";
import { InvitationManagement } from "../_components/invitation-management";

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const organizationId = params.id as string;
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "invitations">("overview");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: organization, refetch } = api.organizations.getById.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const currentUser = organization?.members.find(m => m.user.email === session?.user?.email);
  const isAdmin = currentUser?.role === "ADMIN";

  // Fetch invitations separately since they're now in a separate router
  const { data: invitations, refetch: refetchInvitations } = api.invitations.getInvitations.useQuery(
    { organizationId },
    { enabled: !!organizationId && isAdmin }
  );

  const deleteOrganization = api.organizations.delete.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (error) => {
      alert(error.message || "Failed to delete organization");
    },
  });

  const handleDeleteOrganization = () => {
    if (!confirm("Are you sure you want to delete this organization? This action cannot be undone.")) {
      return;
    }

    deleteOrganization.mutate({ organizationId });
  };

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(280,100%,20%)] to-[hsl(280,100%,10%)] p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <p className="text-white/60">Loading organization...</p>
          </div>
        </div>
      </div>
    );
  }

  // Update the invitations tab to use the separate data
  const pendingInvitationsCount = invitations?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(280,100%,20%)] to-[hsl(280,100%,10%)] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-white/70 hover:text-white transition mb-4"
          >
            ← Back to Dashboard
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {organization.name}
              </h1>
              {organization.description && (
                <p className="text-xl text-white/80 mb-4">
                  {organization.description}
                </p>
              )}
              <p className="text-white/60">
                Created {new Date(organization.createdAt).toLocaleDateString()}
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="px-6 py-3 bg-[hsl(280,100%,70%)] text-black rounded-lg font-semibold hover:bg-[hsl(280,100%,60%)] transition"
                >
                  {showInviteForm ? "Cancel" : "Invite User"}
                </button>
                
                <button
                  onClick={handleDeleteOrganization}
                  disabled={deleteOrganization.isPending}
                  className="px-6 py-3 bg-red-500/20 text-red-300 rounded-lg font-semibold hover:bg-red-500/30 transition disabled:opacity-50"
                >
                  {deleteOrganization.isPending ? "Deleting..." : "Delete Organization"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Invite User Form */}
        {showInviteForm && isAdmin && (
          <div className="bg-white/10 rounded-xl p-6 border border-white/20 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Invite New User</h2>
            <InviteUserForm 
              organizationId={organizationId} 
              onSuccess={() => {
                setShowInviteForm(false);
                refetch();
                refetchInvitations();
              }} 
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "overview"
                ? "bg-[hsl(280,100%,70%)] text-black"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "members"
                ? "bg-[hsl(280,100%,70%)] text-black"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            Members ({organization.members.length})
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("invitations")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === "invitations"
                  ? "bg-[hsl(280,100%,70%)] text-black"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Invitations ({pendingInvitationsCount})
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 rounded-xl p-6 border border-white/20">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">Organization Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-2">Total Members</h3>
                    <p className="text-3xl font-bold text-[hsl(280,100%,70%)]">
                      {organization.members.length}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-2">Admins</h3>
                    <p className="text-3xl font-bold text-blue-400">
                      {organization.members.filter(m => m.role === "ADMIN").length}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-2">Pending Invitations</h3>
                    <p className="text-3xl font-bold text-yellow-400">
                      {pendingInvitationsCount}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Recent Members</h3>
                <div className="space-y-2">
                  {organization.members
                    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
                    .slice(0, 5)
                    .map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10">
                        <div>
                          <p className="text-white font-medium">
                            {member.user.name || "Unknown User"}
                          </p>
                          <p className="text-white/70 text-sm">{member.user.email}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            member.role === 'ADMIN' 
                              ? 'bg-blue-500/20 text-blue-300' 
                              : 'bg-green-500/20 text-green-300'
                          }`}>
                            {member.role}
                          </span>
                          <span className="text-white/50 text-xs">
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "members" && (
            <MemberManagement
              organizationId={organizationId}
              members={organization.members}
              currentUserId={currentUser?.userId || ""}
              onMemberUpdate={refetch}
            />
          )}

          {activeTab === "invitations" && isAdmin && (
            <InvitationManagement
              organizationId={organizationId}
              invitations={invitations || []}
              onInvitationUpdate={() => {
                refetchInvitations();
                refetch();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
