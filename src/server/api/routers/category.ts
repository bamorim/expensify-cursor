import { z } from "zod";
import {
  createTRPCRouter,
  memberProcedure,
  adminProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Input schemas
const createCategorySchema = z.object({
  organizationId: z.string().cuid(),
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Category name must be 50 characters or less"),
  description: z
    .string()
    .max(200, "Description must be 200 characters or less")
    .optional(),
});

const updateCategorySchema = z.object({
  organizationId: z.string().cuid(),
  categoryId: z.string().cuid(),
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Category name must be 50 characters or less"),
  description: z
    .string()
    .max(200, "Description must be 200 characters or less")
    .optional(),
});

const deleteCategorySchema = z.object({
  organizationId: z.string().cuid(),
  categoryId: z.string().cuid(),
});

const getCategoriesSchema = z.object({
  organizationId: z.string().cuid(),
});

const getCategorySchema = z.object({
  organizationId: z.string().cuid(),
  categoryId: z.string().cuid(),
});

export const categoryRouter = createTRPCRouter({
  // Create a new expense category (admin only)
  create: adminProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, name, description } = input;

      // Check if category name already exists in this organization
      const existingCategory = await ctx.db.expenseCategory.findFirst({
        where: {
          organizationId,
          name: {
            equals: name,
            mode: "insensitive", // Case-insensitive comparison
          },
        },
      });

      if (existingCategory) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A category with this name already exists in your organization",
        });
      }

      const category = await ctx.db.expenseCategory.create({
        data: {
          name,
          description,
          organizationId,
        },
      });

      return category;
    }),

  // Get all categories for an organization (members can view)
  getAll: memberProcedure
    .input(getCategoriesSchema)
    .query(async ({ ctx, input }) => {
      const categories = await ctx.db.expenseCategory.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              expenses: true,
              policies: true,
            },
          },
        },
      });

      return categories;
    }),

  // Get a specific category by ID (members can view)
  getById: memberProcedure
    .input(getCategorySchema)
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.expenseCategory.findFirst({
        where: {
          id: input.categoryId,
          organizationId: input.organizationId,
        },
        include: {
          _count: {
            select: {
              expenses: true,
              policies: true,
            },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      return category;
    }),

  // Update a category (admin only)
  update: adminProcedure
    .input(updateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, categoryId, name, description } = input;

      // Check if the new name conflicts with existing categories (excluding current one)
      const existingCategory = await ctx.db.expenseCategory.findFirst({
        where: {
          organizationId,
          name: {
            equals: name,
            mode: "insensitive",
          },
          id: {
            not: categoryId,
          },
        },
      });

      if (existingCategory) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A category with this name already exists in your organization",
        });
      }

      const category = await ctx.db.expenseCategory.update({
        where: {
          id: categoryId,
          organizationId, // Ensure the category belongs to the organization
        },
        data: {
          name,
          description,
        },
      });

      return category;
    }),

  // Delete a category (admin only)
  delete: adminProcedure
    .input(deleteCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, categoryId } = input;

      // Check if category has associated expenses or policies
      const categoryWithDependencies = await ctx.db.expenseCategory.findFirst({
        where: {
          id: categoryId,
          organizationId,
        },
        include: {
          _count: {
            select: {
              expenses: true,
              policies: true,
            },
          },
        },
      });

      if (!categoryWithDependencies) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      if (categoryWithDependencies._count.expenses > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete category that has associated expenses",
        });
      }

      if (categoryWithDependencies._count.policies > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete category that has associated policies",
        });
      }

      await ctx.db.expenseCategory.delete({
        where: {
          id: categoryId,
          organizationId, // Ensure the category belongs to the organization
        },
      });

      return { success: true };
    }),
});
