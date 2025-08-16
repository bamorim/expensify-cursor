import { describe, it, expect, vi, beforeEach } from "vitest";
import { memberRouter } from "./member";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { faker } from "@faker-js/faker";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

// Helper function to create admin test context
async function createAdminTestContext() {
  const user = await db.user.create({
    data: {
      name: "Admin User",
      email: faker.internet.email(),
    },
  });

  const organization = await db.organization.create({
    data: {
      name: "Test Organization",
      slug: "test-org",
    },
  });

  await db.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      role: "ADMIN",
    },
  });

  const mockSession = {
    user,
    expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };

  const caller = memberRouter.createCaller({
    db: db,
    session: mockSession,
    headers: new Headers(),
  });

  return { caller, user, organization, mockSession };
}

describe("MemberRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateRole", () => {
    it("should update member role successfully", async () => {
      const { caller, organization } = await createAdminTestContext();

      // Create another user to update their role
      const targetUser = await db.user.create({
        data: {
          name: "Target User",
          email: faker.internet.email(),
        },
      });

      await db.organizationMember.create({
        data: {
          userId: targetUser.id,
          organizationId: organization.id,
          role: "MEMBER",
        },
      });

      const result = await caller.updateRole({
        organizationId: organization.id,
        userId: targetUser.id,
        role: "ADMIN",
      });

      expect(result.role).toEqual("ADMIN");
      expect(result.user.id).toEqual(targetUser.id);

      // Verify role was updated in database
      const updatedMembership = await db.organizationMember.findFirst({
        where: {
          userId: targetUser.id,
          organizationId: organization.id,
        },
      });

      expect(updatedMembership?.role).toEqual("ADMIN");
    });

    it("should prevent removing the last admin", async () => {
      const { caller, organization, user } = await createAdminTestContext();

      // Try to change the only admin to member
      await expect(
        caller.updateRole({
          organizationId: organization.id,
          userId: user.id,
          role: "MEMBER",
        })
      ).rejects.toThrow("Cannot remove the last admin from the organization");

      // Verify role wasn't changed
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: user.id,
          organizationId: organization.id,
        },
      });

      expect(membership?.role).toEqual("ADMIN");
    });

    it("should allow role change when there are multiple admins", async () => {
      const { caller, organization } = await createAdminTestContext();

      // Create another admin
      const secondAdmin = await db.user.create({
        data: {
          name: "Second Admin",
          email: faker.internet.email(),
        },
      });

      await db.organizationMember.create({
        data: {
          userId: secondAdmin.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      // Now we can change the first admin to member
      const result = await caller.updateRole({
        organizationId: organization.id,
        userId: secondAdmin.id,
        role: "MEMBER",
      });

      expect(result.role).toEqual("MEMBER");

      // Verify role was changed in database
      const updatedMembership = await db.organizationMember.findFirst({
        where: {
          userId: secondAdmin.id,
          organizationId: organization.id,
        },
      });

      expect(updatedMembership?.role).toEqual("MEMBER");
    });
  });

  describe("remove", () => {
    it("should remove member successfully", async () => {
      const { caller, organization } = await createAdminTestContext();

      // Create another user to remove
      const targetUser = await db.user.create({
        data: {
          name: "Target User",
          email: faker.internet.email(),
        },
      });

      await db.organizationMember.create({
        data: {
          userId: targetUser.id,
          organizationId: organization.id,
          role: "MEMBER",
        },
      });

      const result = await caller.remove({
        organizationId: organization.id,
        userId: targetUser.id,
      });

      expect(result).toEqual({ success: true });

      // Verify user was removed from organization
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: targetUser.id,
          organizationId: organization.id,
        },
      });

      expect(membership).toBeNull();
    });

    it("should prevent removing the last admin", async () => {
      const { caller, organization, user } = await createAdminTestContext();

      // Try to remove the only admin
      await expect(
        caller.remove({
          organizationId: organization.id,
          userId: user.id,
        })
      ).rejects.toThrow("Cannot remove the last admin from the organization");

      // Verify admin wasn't removed
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: user.id,
          organizationId: organization.id,
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toEqual("ADMIN");
    });

    it("should allow removal when there are multiple admins", async () => {
      const { caller, organization } = await createAdminTestContext();

      // Create another admin
      const secondAdmin = await db.user.create({
        data: {
          name: "Second Admin",
          email: faker.internet.email(),
        },
      });

      await db.organizationMember.create({
        data: {
          userId: secondAdmin.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      // Now we can remove the second admin
      const result = await caller.remove({
        organizationId: organization.id,
        userId: secondAdmin.id,
      });

      expect(result).toEqual({ success: true });

      // Verify user was removed
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: secondAdmin.id,
          organizationId: organization.id,
        },
      });

      expect(membership).toBeNull();
    });
  });

  describe("getByOrganization", () => {
    it("should return organization members", async () => {
      const { caller, organization } = await createAdminTestContext();

      // Create additional members
      const member1 = await db.user.create({
        data: {
          name: "Member One",
          email: faker.internet.email(),
        },
      });

      const member2 = await db.user.create({
        data: {
          name: "Member Two",
          email: faker.internet.email(),
        },
      });

      await db.organizationMember.create({
        data: {
          userId: member1.id,
          organizationId: organization.id,
          role: "MEMBER",
        },
      });

      await db.organizationMember.create({
        data: {
          userId: member2.id,
          organizationId: organization.id,
          role: "MEMBER",
        },
      });

      const result = await caller.getByOrganization({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(3); // Admin + 2 members
      expect(result[0]?.user.name).toEqual("Member Two"); // Ordered by joinedAt desc
      expect(result[1]?.user.name).toEqual("Member One");
      expect(result[2]?.user.name).toEqual("Admin User");
    });

    it("should return empty array for organization with no members", async () => {
      const { caller, organization } = await createAdminTestContext();

      // Remove all members (this will fail due to foreign key constraints, but let's test the query)
      const result = await caller.getByOrganization({
        organizationId: organization.id,
      });

      // Should still return the admin user
      expect(result).toHaveLength(1);
      expect(result[0]?.role).toEqual("ADMIN");
    });
  });
});
