"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { InviteUserForm } from "../_components/invite-user-form";
import { MemberManagement } from "../_components/member-management";
import { InvitationManagement } from "../_components/invitation-management";
import { CategoryManagement } from "../_components/category-management";

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const organizationId = params.id as string;
  const [activeTab, setActiveTab] = useState<
    "overview" | "members" | "invitations" | "categories"
  >("overview");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: organization, refetch } = api.organizations.getById.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const currentUser = organization?.members.find(
    (m) => m.user.email === session?.user?.email,
  );
  const isAdmin = currentUser?.role === "ADMIN";

  // Fetch invitations separately since they're now in a separate router
  const { data: invitations, refetch: refetchInvitations } =
    api.invitations.getInvitations.useQuery(
      { organizationId },
      { enabled: !!organizationId && isAdmin },
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
    if (
      !confirm(
        "Are you sure you want to delete this organization? This action cannot be undone.",
      )
    ) {
      return;
    }

    deleteOrganization.mutate({ organizationId });
  };

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(280,100%,20%)] to-[hsl(280,100%,10%)] p-8">
        <div className="mx-auto max-w-6xl">
          <div className="py-8 text-center">
            <p className="text-white/60">Loading organization...</p>
          </div>
        </div>
      </div>
    );
  }

  // Update the invitations tab to use the separate data
  const pendingInvitationsCount = invitations?.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(280,100%,20%)] to-[hsl(280,100%,10%)] p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-4 text-white/70 transition hover:text-white"
          >
            ← Back to Dashboard
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-white">
                {organization.name}
              </h1>
              {organization.description && (
                <p className="mb-4 text-xl text-white/80">
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
                  className="rounded-lg bg-[hsl(280,100%,70%)] px-6 py-3 font-semibold text-black transition hover:bg-[hsl(280,100%,60%)]"
                >
                  {showInviteForm ? "Cancel" : "Invite User"}
                </button>

                <button
                  onClick={handleDeleteOrganization}
                  disabled={deleteOrganization.isPending}
                  className="rounded-lg bg-red-500/20 px-6 py-3 font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                >
                  {deleteOrganization.isPending
                    ? "Deleting..."
                    : "Delete Organization"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Invite User Form */}
        {showInviteForm && isAdmin && (
          <div className="mb-8 rounded-xl border border-white/20 bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              Invite New User
            </h2>
            <InviteUserForm
              organizationId={organizationId}
              onSuccess={async () => {
                setShowInviteForm(false);
                await Promise.all([refetch(), refetchInvitations()]);
              }}
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6 flex space-x-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`rounded-lg px-4 py-2 font-medium transition ${
              activeTab === "overview"
                ? "bg-[hsl(280,100%,70%)] text-black"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`rounded-lg px-4 py-2 font-medium transition ${
              activeTab === "members"
                ? "bg-[hsl(280,100%,70%)] text-black"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            Members ({organization.members.length})
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("invitations")}
              className={`rounded-lg px-4 py-2 font-medium transition ${
                activeTab === "invitations"
                  ? "bg-[hsl(280,100%,70%)] text-black"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              Invitations ({pendingInvitationsCount})
            </button>
          )}
          <button
            onClick={() => setActiveTab("categories")}
            className={`rounded-lg px-4 py-2 font-medium transition ${
              activeTab === "categories"
                ? "bg-[hsl(280,100%,70%)] text-black"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            Categories
          </button>
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border border-white/20 bg-white/10 p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-4 text-2xl font-semibold text-white">
                  Organization Overview
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      Total Members
                    </h3>
                    <p className="text-3xl font-bold text-[hsl(280,100%,70%)]">
                      {organization.members.length}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      Admins
                    </h3>
                    <p className="text-3xl font-bold text-blue-400">
                      {
                        organization.members.filter((m) => m.role === "ADMIN")
                          .length
                      }
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      Pending Invitations
                    </h3>
                    <p className="text-3xl font-bold text-yellow-400">
                      {pendingInvitationsCount}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xl font-semibold text-white">
                  Recent Members
                </h3>
                <div className="space-y-2">
                  {organization.members
                    .sort(
                      (a, b) =>
                        new Date(b.joinedAt).getTime() -
                        new Date(a.joinedAt).getTime(),
                    )
                    .slice(0, 5)
                    .map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded border border-white/10 bg-white/5 p-3"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {member.user.name ?? "Unknown User"}
                          </p>
                          <p className="text-sm text-white/70">
                            {member.user.email}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              member.role === "ADMIN"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-green-500/20 text-green-300"
                            }`}
                          >
                            {member.role}
                          </span>
                          <span className="text-xs text-white/50">
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
              currentUserId={currentUser?.userId ?? ""}
              onMemberUpdate={refetch}
            />
          )}

          {activeTab === "invitations" && isAdmin && (
            <InvitationManagement
              organizationId={organizationId}
              invitations={invitations ?? []}
              onInvitationUpdate={async () => {
                await Promise.all([refetch(), refetchInvitations()]);
              }}
            />
          )}

          {activeTab === "categories" && (
            <CategoryManagement
              organizationId={organizationId}
              userRole={currentUser?.role ?? "MEMBER"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
