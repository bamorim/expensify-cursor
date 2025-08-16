import { describe, it, expect, vi, beforeEach } from "vitest";
import { organizationRouter } from "./organization";
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

  const caller = organizationRouter.createCaller({
    db: db,
    session: mockSession,
    headers: new Headers(),
  });

  return { caller, user, mockSession };
}

describe("OrganizationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create an organization successfully", async () => {
      const { caller, user } = await createTestContext();

      const result = await caller.create({
        name: "Test Organization",
        description: "A test organization",
      });

      expect(result.name).toEqual("Test Organization");
      expect(result.description).toEqual("A test organization");
      expect(result.slug).toEqual("test-organization");

      // Verify organization was created
      const organization = await db.organization.findUnique({
        where: {
          id: result.id,
        },
      });

      expect(organization).toBeDefined();
      expect(organization?.name).toEqual("Test Organization");

      // Verify user was added as admin
      const membership = await db.organizationMember.findFirst({
        where: {
          organizationId: result.id,
          userId: user.id,
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toEqual("ADMIN");
    });

    it("should create organization with minimal data", async () => {
      const { caller } = await createTestContext();

      const result = await caller.create({
        name: "Minimal Org",
      });

      expect(result.name).toEqual("Minimal Org");
      expect(result.description).toBeNull();
      expect(result.slug).toEqual("minimal-org");
    });

    it("should generate slug from organization name", async () => {
      const { caller } = await createTestContext();

      const result = await caller.create({
        name: "Complex Organization Name 123",
      });

      expect(result.slug).toEqual("complex-organization-name-123");
    });
  });

  describe("getMyOrganizations", () => {
    it("should return user's organizations", async () => {
      const { caller } = await createTestContext();

      const result = await caller.getMyOrganizations();

      expect(Array.isArray(result)).toBe(true);
      // Should be empty initially since no organizations created yet
      expect(result).toHaveLength(0);
    });
  });

  describe("getById", () => {
    it("should return organization if user is a member", async () => {
      const { caller, user } = await createTestContext();

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
          role: "MEMBER",
        },
      });

      const result = await caller.getById({ organizationId: organization.id });

      expect(result.id).toEqual(organization.id);
      expect(result.name).toEqual("Test Organization");
    });

    it("should throw error if user is not a member", async () => {
      const { caller } = await createTestContext();

      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          slug: "test-org",
        },
      });

      await expect(
        caller.getById({ organizationId: organization.id }),
      ).rejects.toThrow("Organization membership required");
    });
  });
});
