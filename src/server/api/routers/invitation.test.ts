import { describe, it, expect, vi, beforeEach } from "vitest";
import { invitationRouter } from "./invitation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { faker } from "@faker-js/faker";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

// Helper function to create test context
async function createTestContext() {
  const user = await db.user.create({
    data: {
      name: "Test User",
      email: faker.internet.email(),
    },
  });

  const mockSession = {
    user,
    expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
  };

  const caller = invitationRouter.createCaller({
    db: db,
    session: mockSession,
    headers: new Headers(),
  });

  return { caller, user, mockSession };
}

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

  const caller = invitationRouter.createCaller({
    db: db,
    session: mockSession,
    headers: new Headers(),
  });

  return { caller, user, organization, mockSession };
}

describe("InvitationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inviteUser", () => {
    it("should create an invitation successfully", async () => {
      const { caller, organization } = await createAdminTestContext();

      const result = await caller.inviteUser({
        organizationId: organization.id,
        email: "newuser@example.com",
        role: "MEMBER",
      });

      expect(result.email).toEqual("newuser@example.com");
      expect(result.organizationId).toEqual(organization.id);
      expect(result.role).toEqual("MEMBER");
      expect(result.status).toEqual("PENDING");
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Verify invitation was created in database
      const invitation = await db.organizationInvitation.findUnique({
        where: { id: result.id },
      });

      expect(invitation).toBeDefined();
      expect(invitation?.email).toEqual("newuser@example.com");
      expect(invitation?.organizationId).toEqual(organization.id);
    });

    it("should reject invitation if user is already a member", async () => {
      const { caller, organization } = await createAdminTestContext();

      // Create a user and add them as a member
      const existingUser = await db.user.create({
        data: {
          name: "Existing User",
          email: "existing@example.com",
        },
      });

      await db.organizationMember.create({
        data: {
          userId: existingUser.id,
          organizationId: organization.id,
          role: "MEMBER",
        },
      });

      await expect(
        caller.inviteUser({
          organizationId: organization.id,
          email: "existing@example.com",
          role: "MEMBER",
        })
      ).rejects.toThrow("User is already a member of this organization");
    });

    it("should reject invitation if there's already a pending invitation", async () => {
      const { caller, organization, user } = await createAdminTestContext();

      // Create a pending invitation
      await db.organizationInvitation.create({
        data: {
          email: "pending@example.com",
          organizationId: organization.id,
          invitedBy: user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await expect(
        caller.inviteUser({
          organizationId: organization.id,
          email: "pending@example.com",
          role: "MEMBER",
        })
      ).rejects.toThrow("User already has a pending invitation");
    });
  });

  describe("getInvitations", () => {
    it("should return pending invitations for an organization", async () => {
      const { caller, organization, user } = await createAdminTestContext();

      // Create some invitations
      const invitation1 = await db.organizationInvitation.create({
        data: {
          email: "user1@example.com",
          organizationId: organization.id,
          invitedBy: user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const invitation2 = await db.organizationInvitation.create({
        data: {
          email: "user2@example.com",
          organizationId: organization.id,
          invitedBy: user.id,
          role: "ADMIN",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await caller.getInvitations({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.email).toEqual("user2@example.com"); // Should be ordered by createdAt desc
      expect(result[1]?.email).toEqual("user1@example.com");
    });

    it("should return empty array for organization with no invitations", async () => {
      const { caller, organization } = await createAdminTestContext();

      const result = await caller.getInvitations({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("cancelInvitation", () => {
    it("should cancel an invitation successfully", async () => {
      const { caller, organization, user } = await createAdminTestContext();

      const invitation = await db.organizationInvitation.create({
        data: {
          email: "user@example.com",
          organizationId: organization.id,
          invitedBy: user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await caller.cancelInvitation({
        organizationId: organization.id,
        invitationId: invitation.id,
      });

      expect(result).toEqual({ success: true });

      // Verify invitation was cancelled in database
      const cancelledInvitation = await db.organizationInvitation.findUnique({
        where: { id: invitation.id },
      });

      expect(cancelledInvitation?.status).toEqual("CANCELLED");
    });
  });

  describe("acceptInvitation", () => {
    it("should accept an invitation successfully", async () => {
      const { organization, user } = await createAdminTestContext();

      const invitation = await db.organizationInvitation.create({
        data: {
          email: "member@example.com",
          organizationId: organization.id,
          invitedBy: user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Create a new user to accept the invitation
      const acceptingUser = await db.user.create({
        data: {
          name: "Accepting User",
          email: "member@example.com",
        },
      });

      const mockSession = {
        user: acceptingUser,
        expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.acceptInvitation({
        invitationId: invitation.id,
      });

      expect(result).toEqual({ success: true });

      // Verify user was added to organization
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: acceptingUser.id,
          organizationId: organization.id,
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toEqual("MEMBER");

      // Verify invitation was marked as accepted
      const acceptedInvitation = await db.organizationInvitation.findUnique({
        where: { id: invitation.id },
      });

      expect(acceptedInvitation?.status).toEqual("ACCEPTED");
      expect(acceptedInvitation?.acceptedAt).toBeInstanceOf(Date);
    });

    it("should reject expired invitation", async () => {
      const { organization, user } = await createAdminTestContext();

      const expiredInvitation = await db.organizationInvitation.create({
        data: {
          email: "member@example.com",
          organizationId: organization.id,
          invitedBy: user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        },
      });

      const acceptingUser = await db.user.create({
        data: {
          name: "Accepting User",
          email: "member@example.com",
        },
      });

      const mockSession = {
        user: acceptingUser,
        expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.acceptInvitation({
          invitationId: expiredInvitation.id,
        })
      ).rejects.toThrow("Invitation has expired");
    });

    it("should reject invitation for wrong email", async () => {
      const { organization, user } = await createAdminTestContext();

      const invitation = await db.organizationInvitation.create({
        data: {
          email: "wrong@example.com",
          organizationId: organization.id,
          invitedBy: user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const acceptingUser = await db.user.create({
        data: {
          name: "Accepting User",
          email: "member@example.com", // Different email
        },
      });

      const mockSession = {
        user: acceptingUser,
        expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.acceptInvitation({
          invitationId: invitation.id,
        })
      ).rejects.toThrow("This invitation is not for your email address");
    });

    it("should reject if user is already a member", async () => {
      const { organization, user } = await createAdminTestContext();

      const invitation = await db.organizationInvitation.create({
        data: {
          email: "member@example.com",
          organizationId: organization.id,
          invitedBy: user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Create a user and add them as a member
      const existingUser = await db.user.create({
        data: {
          name: "Existing Member",
          email: "member@example.com",
        },
      });

      await db.organizationMember.create({
        data: {
          userId: existingUser.id,
          organizationId: organization.id,
          role: "MEMBER",
        },
      });

      const mockSession = {
        user: existingUser,
        expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.acceptInvitation({
          invitationId: invitation.id,
        })
      ).rejects.toThrow("You are already a member of this organization");
    });
  });

  describe("getMyInvitations", () => {
    it("should return user's pending invitations", async () => {
      const { caller, organization, user } = await createAdminTestContext();

      // Create invitations for the user
      await db.organizationInvitation.create({
        data: {
          email: user.email!,
          organizationId: organization.id,
          invitedBy: user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await caller.getMyInvitations();

      expect(result).toHaveLength(1);
      expect(result[0]?.email).toEqual(user.email);
      expect(result[0]?.organizationId).toEqual(organization.id);
    });

    it("should return empty array if user has no invitations", async () => {
      const { caller } = await createTestContext();

      const result = await caller.getMyInvitations();

      expect(result).toHaveLength(0);
    });
  });
});
