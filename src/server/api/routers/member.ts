import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";

// Input schemas
const updateMemberRoleSchema = z.object({
  organizationId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

const removeMemberSchema = z.object({
  organizationId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const memberRouter = createTRPCRouter({
  // Update member role (admin only)
  updateRole: adminProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId, role } = input;

      // Prevent admin from removing their own admin role if they're the only admin
      if (role === "MEMBER") {
        const adminCount = await ctx.db.organizationMember.count({
          where: {
            organizationId,
            role: "ADMIN",
          },
        });

        if (adminCount === 1) {
          const isSelf = await ctx.db.organizationMember.findFirst({
            where: {
              organizationId,
              userId,
              role: "ADMIN",
            },
          });

          if (isSelf) {
            throw new Error("Cannot remove the last admin from the organization");
          }
        }
      }

      const membership = await ctx.db.organizationMember.update({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return membership;
    }),

  // Remove member from organization (admin only)
  remove: adminProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = input;

      // Prevent admin from removing themselves if they're the only admin
      const adminCount = await ctx.db.organizationMember.count({
        where: {
          organizationId,
          role: "ADMIN",
        },
      });

      if (adminCount === 1) {
        const isSelf = await ctx.db.organizationMember.findFirst({
          where: {
            organizationId,
            userId,
            role: "ADMIN",
          },
        });

        if (isSelf) {
          throw new Error("Cannot remove the last admin from the organization");
        }
      }

      await ctx.db.organizationMember.delete({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      return { success: true };
    }),

  // Get organization members
  getByOrganization: adminProcedure
    .input(z.object({ organizationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.organizationMember.findMany({
        where: { organizationId: input.organizationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });
    }),
});
