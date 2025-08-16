import { z } from "zod";
import { createTRPCRouter, protectedProcedure, memberProcedure, adminProcedure } from "~/server/api/trpc";

// Input schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  description: z.string().optional(),
});

const organizationIdSchema = z.object({
  organizationId: z.string().cuid(),
});

const updateOrganizationSchema = z.object({
  organizationId: z.string().cuid(),
  name: z.string().min(1, "Organization name is required").max(100),
  description: z.string().optional(),
});

export const organizationRouter = createTRPCRouter({
  // Create a new organization
  create: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, description } = input;
      const userId = ctx.session.user.id;

      // Create organization and add user as admin
      const organization = await ctx.db.organization.create({
        data: {
          name,
          description,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          members: {
            create: {
              userId,
              role: 'ADMIN',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return organization;
    }),

  // Get user's organizations
  getMyOrganizations: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      return ctx.db.organizationMember.findMany({
        where: { userId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              slug: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
      });
    }),

  // Get organization by ID (requires membership)
  getById: memberProcedure
    .input(organizationIdSchema)
    .query(async ({ ctx, input }) => {
      // The middleware already verified membership and added organizationId to context
      const organization = await ctx.db.organization.findUnique({
        where: { id: input.organizationId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!organization) {
        throw new Error("Organization not found");
      }

      return organization;
    }),

  // Update organization (admin only)
  update: adminProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, name, description } = input;

      const organization = await ctx.db.organization.update({
        where: { id: organizationId },
        data: {
          name,
          description,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return organization;
    }),

  // Delete organization (admin only)
  delete: adminProcedure
    .input(organizationIdSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.organization.delete({
        where: { id: input.organizationId },
      });

      return { success: true };
    }),
});
