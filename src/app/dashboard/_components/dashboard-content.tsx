"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { api } from "~/trpc/react";
import { InvitationAcceptance } from "../../organizations/_components/invitation-acceptance";

interface DashboardContentProps {
  user: Session["user"];
}

export function DashboardContent({ user }: DashboardContentProps) {
  const { data: myOrganizations, isLoading } = api.organizations.getMyOrganizations.useQuery();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome back, {user?.name || "User"}!
        </h1>
        <p className="text-xl text-white/80">
          Manage your expenses and organization
        </p>
      </div>

      {/* Pending Invitations */}
      <InvitationAcceptance />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/organizations"
          className="p-6 rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/20"
        >
          <h3 className="text-xl font-semibold mb-2">Organizations</h3>
          <p className="text-white/70">Create or manage your organizations</p>
        </Link>

        <div className="p-6 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-xl font-semibold mb-2">Expenses</h3>
          <p className="text-white/70">Submit and track expense requests</p>
          <p className="text-sm text-white/50 mt-2">Coming soon</p>
        </div>

        <div className="p-6 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-xl font-semibold mb-2">Policies</h3>
          <p className="text-white/70">View expense policies and rules</p>
          <p className="text-sm text-white/50 mt-2">Coming soon</p>
        </div>
      </div>

      {/* Organization Status */}
      <div className="bg-white/10 rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-semibold mb-4">Your Organizations</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-white/60">Loading organizations...</p>
          </div>
        ) : myOrganizations && myOrganizations.length > 0 ? (
          <div className="space-y-4">
            {myOrganizations.map((membership) => (
              <Link
                key={membership.organization.id}
                href={`/organizations/${membership.organization.id}`}
                className="block p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {membership.organization.name}
                    </h3>
                    {membership.organization.description && (
                      <p className="text-white/70 text-sm mt-1">
                        {membership.organization.description}
                      </p>
                    )}
                    <p className="text-white/50 text-xs mt-2">
                      Role: {membership.role} • Joined: {new Date(membership.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      membership.role === 'ADMIN' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {membership.role}
                    </span>
                    <span className="text-white/40 text-xs">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-white/60 mb-4">
              You haven't joined any organizations yet
            </p>
            <Link
              href="/organizations"
              className="inline-block bg-[hsl(280,100%,70%)] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[hsl(280,100%,60%)] transition"
            >
              Create Your First Organization
            </Link>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white/10 rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
        <div className="text-center py-8">
          <p className="text-white/60">
            No recent activity to display
          </p>
        </div>
      </div>
    </div>
  );
}
