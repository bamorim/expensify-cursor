import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "~/server/api/trpc";

// Input schemas
const inviteUserSchema = z.object({
  organizationId: z.string().cuid(),
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

const acceptInvitationSchema = z.object({
  invitationId: z.string().cuid(),
});

const cancelInvitationSchema = z.object({
  organizationId: z.string().cuid(),
  invitationId: z.string().cuid(),
});

export const invitationRouter = createTRPCRouter({
  // Invite user to organization (admin only)
  inviteUser: adminProcedure
    .input(inviteUserSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, email, role } = input;
      const invitedBy = ctx.session.user.id;

      // Check if user is already a member
      const existingMember = await ctx.db.organizationMember.findFirst({
        where: {
          organizationId,
          user: { email },
        },
      });

      if (existingMember) {
        throw new Error("User is already a member of this organization");
      }

      // Check if there's already a pending invitation
      const existingInvitation = await ctx.db.organizationInvitation.findFirst({
        where: {
          organizationId,
          email,
          status: "PENDING",
        },
      });

      if (existingInvitation) {
        throw new Error("User already has a pending invitation");
      }

      // Create invitation (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await ctx.db.organizationInvitation.create({
        data: {
          email,
          organizationId,
          invitedBy,
          role,
          expiresAt,
        },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
          invitedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // TODO: Send email invitation (implement email service later)
      console.log(
        `Invitation sent to ${email} for organization ${invitation.organization.name}`,
      );

      return invitation;
    }),

  // Get pending invitations for an organization (admin only)
  getInvitations: adminProcedure
    .input(z.object({ organizationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.organizationInvitation.findMany({
        where: {
          organizationId: input.organizationId,
          status: "PENDING",
        },
        include: {
          invitedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Cancel invitation (admin only)
  cancelInvitation: adminProcedure
    .input(cancelInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.organizationInvitation.update({
        where: { id: input.invitationId },
        data: { status: "CANCELLED" },
      });

      return { success: true };
    }),

  // Accept invitation (any authenticated user)
  acceptInvitation: protectedProcedure
    .input(acceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { invitationId } = input;
      const userId = ctx.session.user.id;

      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { id: invitationId },
        include: { organization: true },
      });

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      if (invitation.status !== "PENDING") {
        throw new Error("Invitation is no longer valid");
      }

      if (invitation.expiresAt < new Date()) {
        throw new Error("Invitation has expired");
      }

      if (invitation.email !== ctx.session.user.email) {
        throw new Error("This invitation is not for your email address");
      }

      // Check if user is already a member
      const existingMember = await ctx.db.organizationMember.findFirst({
        where: {
          userId,
          organizationId: invitation.organizationId,
        },
      });

      if (existingMember) {
        throw new Error("You are already a member of this organization");
      }

      // Add user to organization and mark invitation as accepted
      await ctx.db.$transaction([
        ctx.db.organizationMember.create({
          data: {
            userId,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        }),
        ctx.db.organizationInvitation.update({
          where: { id: invitationId },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        }),
      ]);

      return { success: true };
    }),

  // Get pending invitations for current user
  getMyInvitations: protectedProcedure.query(async ({ ctx }) => {
    const userEmail = ctx.session.user.email;

    if (!userEmail) {
      return [];
    }

    return ctx.db.organizationInvitation.findMany({
      where: {
        email: userEmail,
        status: "PENDING",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        invitedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),
});
