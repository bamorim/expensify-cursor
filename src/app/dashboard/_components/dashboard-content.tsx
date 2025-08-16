"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { api } from "~/trpc/react";
import { InvitationAcceptance } from "../../organizations/_components/invitation-acceptance";

interface DashboardContentProps {
  user: Session["user"];
}

export function DashboardContent({ user }: DashboardContentProps) {
  const { data: myOrganizations, isLoading } =
    api.organizations.getMyOrganizations.useQuery();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">
          Welcome back, {user?.name ?? "User"}!
        </h1>
        <p className="text-xl text-white/80">
          Manage your expenses and organization
        </p>
      </div>

      {/* Pending Invitations */}
      <InvitationAcceptance />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link
          href="/organizations"
          className="rounded-xl border border-white/20 bg-white/10 p-6 transition hover:bg-white/20"
        >
          <h3 className="mb-2 text-xl font-semibold">Organizations</h3>
          <p className="text-white/70">Create or manage your organizations</p>
        </Link>

        <div className="rounded-xl border border-white/20 bg-white/10 p-6">
          <h3 className="mb-2 text-xl font-semibold">Expenses</h3>
          <p className="text-white/70">Submit and track expense requests</p>
          <p className="mt-2 text-sm text-white/50">Coming soon</p>
        </div>

        <div className="rounded-xl border border-white/20 bg-white/10 p-6">
          <h3 className="mb-2 text-xl font-semibold">Policies</h3>
          <p className="text-white/70">View expense policies and rules</p>
          <p className="mt-2 text-sm text-white/50">Coming soon</p>
        </div>
      </div>

      {/* Organization Status */}
      <div className="rounded-xl border border-white/20 bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-semibold">Your Organizations</h2>

        {isLoading ? (
          <div className="py-8 text-center">
            <p className="text-white/60">Loading organizations...</p>
          </div>
        ) : myOrganizations && myOrganizations.length > 0 ? (
          <div className="space-y-4">
            {myOrganizations.map((membership) => (
              <Link
                key={membership.organization.id}
                href={`/organizations/${membership.organization.id}`}
                className="block rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {membership.organization.name}
                    </h3>
                    {membership.organization.description && (
                      <p className="mt-1 text-sm text-white/70">
                        {membership.organization.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-white/50">
                      Role: {membership.role} • Joined:{" "}
                      {new Date(membership.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        membership.role === "ADMIN"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-green-500/20 text-green-300"
                      }`}
                    >
                      {membership.role}
                    </span>
                    <span className="text-xs text-white/40">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="mb-4 text-white/60">
              {"You haven't joined any organizations yet"}
            </p>
            <Link
              href="/organizations"
              className="inline-block rounded-lg bg-[hsl(280,100%,70%)] px-6 py-3 font-semibold text-black transition hover:bg-[hsl(280,100%,60%)]"
            >
              Create Your First Organization
            </Link>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-white/20 bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-semibold">Recent Activity</h2>
        <div className="py-8 text-center">
          <p className="text-white/60">No recent activity to display</p>
        </div>
      </div>
    </div>
  );
}
