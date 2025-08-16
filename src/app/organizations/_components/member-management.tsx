"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

interface Member {
  id: string;
  userId: string;
  role: "ADMIN" | "MEMBER";
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface MemberManagementProps {
  organizationId: string;
  members: Member[];
  currentUserId: string;
  onMemberUpdate: () => void;
}

export function MemberManagement({
  organizationId,
  members,
  currentUserId,
  onMemberUpdate,
}: MemberManagementProps) {
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  const updateMemberRole = api.members.updateRole.useMutation({
    onSuccess: () => {
      setEditingMember(null);
      onMemberUpdate();
    },
    onError: (error) => {
      alert(error.message || "Failed to update member role");
    },
  });

  const removeMember = api.members.remove.useMutation({
    onSuccess: () => {
      onMemberUpdate();
    },
    onError: (error) => {
      alert(error.message || "Failed to remove member");
    },
  });

  const handleRoleUpdate = async (userId: string) => {
    try {
      await updateMemberRole.mutateAsync({
        organizationId,
        userId,
        role: newRole,
      });
    } catch {
      // Error is handled by onError callback
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${userName} from the organization?`,
      )
    ) {
      return;
    }

    try {
      await removeMember.mutateAsync({
        organizationId,
        userId,
      });
    } catch {
      // Error is handled by onError callback
    }
  };

  const canEditMember = (member: Member) => {
    // Can't edit yourself
    if (member.userId === currentUserId) return false;

    // Only admins can edit members
    const currentMember = members.find((m) => m.userId === currentUserId);
    return currentMember?.role === "ADMIN";
  };

  const canRemoveMember = (member: Member) => {
    // Can't remove yourself
    if (member.userId === currentUserId) return false;

    // Only admins can remove members
    const currentMember = members.find((m) => m.userId === currentUserId);
    return currentMember?.role === "ADMIN";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Members</h3>

      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <p className="font-medium text-white">
                    {member.user.name ?? "Unknown User"}
                  </p>
                  <p className="text-sm text-white/70">{member.user.email}</p>
                  <p className="text-xs text-white/50">
                    Joined: {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    member.role === "ADMIN"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-green-500/20 text-green-300"
                  }`}
                >
                  {member.role}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {editingMember === member.id ? (
                <div className="flex items-center space-x-2">
                  <select
                    value={newRole}
                    onChange={(e) =>
                      setNewRole(e.target.value as "ADMIN" | "MEMBER")
                    }
                    className="rounded border border-white/20 bg-white/10 px-3 py-1 text-sm text-white"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    onClick={() => handleRoleUpdate(member.userId)}
                    disabled={updateMemberRole.isPending}
                    className="rounded bg-green-500/20 px-3 py-1 text-sm text-green-300 hover:bg-green-500/30 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingMember(null)}
                    className="rounded bg-gray-500/20 px-3 py-1 text-sm text-gray-300 hover:bg-gray-500/30"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  {canEditMember(member) && (
                    <button
                      onClick={() => {
                        setEditingMember(member.id);
                        setNewRole(member.role);
                      }}
                      className="rounded bg-blue-500/20 px-3 py-1 text-sm text-blue-300 hover:bg-blue-500/30"
                    >
                      Edit Role
                    </button>
                  )}

                  {canRemoveMember(member) && (
                    <button
                      onClick={() =>
                        handleRemoveMember(
                          member.userId,
                          member.user.name ?? "this user",
                        )
                      }
                      disabled={removeMember.isPending}
                      className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-white/60">No members found</p>
        </div>
      )}
    </div>
  );
}
