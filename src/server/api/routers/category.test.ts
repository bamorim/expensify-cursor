import { describe, it, expect, vi, beforeEach } from "vitest";
import { categoryRouter } from "./category";
import { db } from "~/server/db";
import { faker } from "@faker-js/faker";
import type { Organization } from "@prisma/client";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

// Helper function to create test context
async function createTestContext(
  role: "ADMIN" | "MEMBER" = "ADMIN",
  organization?: Organization,
) {
  const user = await db.user.create({
    data: {
      name: `${role} User`,
      email: faker.internet.email(),
    },
  });

  let finalOrganization: Organization;
  if (!organization) {
    // Create new organization
    finalOrganization = await db.organization.create({
      data: {
        name: faker.company.name(),
        slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
      },
    });
  } else {
    finalOrganization = organization;
  }

  await db.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: finalOrganization.id,
      role,
    },
  });

  const mockSession = {
    user,
    expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };

  const caller = categoryRouter.createCaller({
    db: db,
    session: mockSession,
    headers: new Headers(),
  });

  return { caller, user, organization: finalOrganization, mockSession };
}

describe("CategoryRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new category successfully", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      const result = await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      expect(result.name).toEqual("Travel");
      expect(result.description).toEqual("Business travel expenses");
      expect(result.organizationId).toEqual(organization.id);

      // Verify category was created in database
      const category = await db.expenseCategory.findUnique({
        where: { id: result.id },
      });

      expect(category).toBeDefined();
      expect(category?.name).toEqual("Travel");
      expect(category?.organizationId).toEqual(organization.id);
    });

    it("should reject creation if category name already exists", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      // Create first category
      await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      // Try to create another with same name
      await expect(
        caller.create({
          organizationId: organization.id,
          name: "Travel",
          description: "Different description",
        }),
      ).rejects.toThrow(
        "A category with this name already exists in your organization",
      );
    });

    it("should create category with minimal data", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      const result = await caller.create({
        organizationId: organization.id,
        name: "Minimal Category",
      });

      expect(result.name).toEqual("Minimal Category");
      expect(result.description).toBeNull();
      expect(result.organizationId).toEqual(organization.id);
    });
  });

  describe("getAll", () => {
    it("should return all categories for an organization", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      // Create some categories
      await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      await caller.create({
        organizationId: organization.id,
        name: "Meals",
        description: "Business meal expenses",
      });

      const result = await caller.getAll({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toEqual("Meals"); // Should be ordered by name asc
      expect(result[1]?.name).toEqual("Travel");
    });

    it("should return empty array when no categories exist", async () => {
      const { caller, organization } = await createTestContext("MEMBER");

      const result = await caller.getAll({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(0);
    });

    it("should include expense and policy counts", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      const result = await caller.getAll({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?._count.expenses).toBeDefined();
      expect(result[0]?._count.policies).toBeDefined();
    });
  });

  describe("getById", () => {
    it("should return a specific category", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      const createdCategory = await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      const result = await caller.getById({
        organizationId: organization.id,
        categoryId: createdCategory.id,
      });

      expect(result.id).toEqual(createdCategory.id);
      expect(result.name).toEqual("Travel");
      expect(result.description).toEqual("Business travel expenses");
    });

    it("should throw error if category not found", async () => {
      const { caller, organization } = await createTestContext("MEMBER");

      // Generate a valid cuid format but one that doesn't exist
      const fakeId = "cl" + "x".repeat(22);

      await expect(
        caller.getById({
          organizationId: organization.id,
          categoryId: fakeId,
        }),
      ).rejects.toThrow("Category not found");
    });

    it("should include expense and policy counts", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      const category = await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      const result = await caller.getById({
        organizationId: organization.id,
        categoryId: category.id,
      });

      expect(result._count.expenses).toBeDefined();
      expect(result._count.policies).toBeDefined();
    });
  });

  describe("update", () => {
    it("should update a category successfully", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      const category = await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      const result = await caller.update({
        organizationId: organization.id,
        categoryId: category.id,
        name: "Updated Travel",
        description: "Updated description",
      });

      expect(result.name).toEqual("Updated Travel");
      expect(result.description).toEqual("Updated description");

      // Verify category was updated in database
      const updatedCategory = await db.expenseCategory.findUnique({
        where: { id: category.id },
      });

      expect(updatedCategory?.name).toEqual("Updated Travel");
      expect(updatedCategory?.description).toEqual("Updated description");
    });

    it("should reject update if new name conflicts with existing category", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      // Create two categories
      await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      const category2 = await caller.create({
        organizationId: organization.id,
        name: "Meals",
        description: "Business meal expenses",
      });

      // Try to rename category2 to "Travel"
      await expect(
        caller.update({
          organizationId: organization.id,
          categoryId: category2.id,
          name: "Travel",
          description: "Updated description",
        }),
      ).rejects.toThrow(
        "A category with this name already exists in your organization",
      );
    });

    it("should allow update to same name for same category", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      const category = await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      const result = await caller.update({
        organizationId: organization.id,
        categoryId: category.id,
        name: "Travel", // Same name
        description: "Updated description",
      });

      expect(result.name).toEqual("Travel");
      expect(result.description).toEqual("Updated description");
    });
  });

  describe("delete", () => {
    it("should delete a category successfully when no dependencies", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      const category = await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      const result = await caller.delete({
        organizationId: organization.id,
        categoryId: category.id,
      });

      expect(result).toEqual({ success: true });

      // Verify category was deleted from database
      const deletedCategory = await db.expenseCategory.findUnique({
        where: { id: category.id },
      });

      expect(deletedCategory).toBeNull();
    });

    it("should reject deletion if category has associated expenses", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      const category = await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      // Create an expense for this category
      await db.expense.create({
        data: {
          amount: 100.0,
          description: "Flight ticket",
          date: new Date(),
          categoryId: category.id,
          userId: (await createTestContext("ADMIN")).user.id,
          organizationId: organization.id,
          status: "SUBMITTED",
        },
      });

      await expect(
        caller.delete({
          organizationId: organization.id,
          categoryId: category.id,
        }),
      ).rejects.toThrow("Cannot delete category that has associated expenses");
    });

    it("should reject deletion if category has associated policies", async () => {
      const { caller, organization } = await createTestContext("ADMIN");

      const category = await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      // Create a policy for this category
      await db.policy.create({
        data: {
          name: "Travel Policy",
          description: "Travel expense policy",
          organizationId: organization.id,
          categoryId: category.id,
          maxAmount: 1000.0,
          period: "MONTHLY",
          requiresReview: true,
        },
      });

      await expect(
        caller.delete({
          organizationId: organization.id,
          categoryId: category.id,
        }),
      ).rejects.toThrow("Cannot delete category that has associated policies");
    });
  });

  describe("authorization", () => {
    it("should require admin access for create operation", async () => {
      const { caller, organization } = await createTestContext("MEMBER");

      await expect(
        caller.create({
          organizationId: organization.id,
          name: "Travel",
          description: "Business travel expenses",
        }),
      ).rejects.toThrow("Admin access required");
    });

    it("should require admin access for update operation", async () => {
      const { caller, organization } = await createTestContext("MEMBER");

      // Create category as admin first by adding admin to the member's organization
      const adminContext = await createTestContext("ADMIN", organization);

      // Add admin user to the member's organization as admin

      const category = await adminContext.caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      // Try to update as member
      await expect(
        caller.update({
          organizationId: organization.id,
          categoryId: category.id,
          name: "Updated Travel",
          description: "Updated description",
        }),
      ).rejects.toThrow("Admin access required");
    });

    it("should require admin access for delete operation", async () => {
      const { caller, organization } = await createTestContext("MEMBER");

      // Create category as admin first by adding admin to the member's organization
      const adminContext = await createTestContext("ADMIN", organization);

      const category = await adminContext.caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      // Try to delete as member
      await expect(
        caller.delete({
          organizationId: organization.id,
          categoryId: category.id,
        }),
      ).rejects.toThrow("Admin access required");
    });

    it("should allow member access for read operations", async () => {
      const { caller, organization } = await createTestContext("MEMBER");

      // Create category as admin first by adding admin to the member's organization
      const adminContext = await createTestContext("ADMIN");

      // Add admin user to the member's organization as admin
      await db.organizationMember.create({
        data: {
          userId: adminContext.user.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      await adminContext.caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      // Member should be able to read
      const result = await caller.getAll({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toEqual("Travel");
    });
  });

  describe("data isolation", () => {
    it("should not return categories from other organizations", async () => {
      const { caller: caller1, organization: org1 } =
        await createTestContext("ADMIN");
      const { caller: caller2, organization: org2 } =
        await createTestContext("ADMIN");

      // Create category in first organization
      await caller1.create({
        organizationId: org1.id,
        name: "Travel",
        description: "Business travel expenses",
      });

      // Create category in second organization
      await caller2.create({
        organizationId: org2.id,
        name: "Meals",
        description: "Business meal expenses",
      });

      // Check that each organization only sees its own categories
      const org1Categories = await caller1.getAll({ organizationId: org1.id });
      const org2Categories = await caller2.getAll({ organizationId: org2.id });

      expect(org1Categories).toHaveLength(1);
      expect(org1Categories[0]?.name).toEqual("Travel");
      expect(org2Categories).toHaveLength(1);
      expect(org2Categories[0]?.name).toEqual("Meals");
    });
  });
});
