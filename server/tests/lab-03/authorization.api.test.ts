import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import {
  authenticateToken,
  requirePasswordChanged,
  requireRole,
  signToken,
} from "../../src/auth.js";
import { setPrisma } from "../../src/prisma.js";

describe("Lab 3: Authorization & Middleware Guards (authorization.api.test.ts)", () => {
  let testApp: express.Express;
  let mockUser: any;

  beforeEach(() => {
    mockUser = {
      id: 1,
      name: "Requester User",
      email: "requester@toktick.local",
      role: "Requester",
      passwordHash: "hash",
      isActive: true,
      mustChangePassword: false,
    };

    setPrisma({
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id === mockUser.id) {
            return mockUser;
          }
          return null;
        },
      },
    });

    testApp = express();
    testApp.use(express.json());

    // Protected endpoint requiring authentication and normal password
    testApp.get("/test/protected", authenticateToken, requirePasswordChanged, (req, res) => {
      res.json({ message: "Access granted", user: req.user });
    });

    // Endpoint requiring IT_Staff or Administrator role
    testApp.get(
      "/test/staff-only",
      authenticateToken,
      requirePasswordChanged,
      requireRole(["IT_Staff", "Administrator"]),
      (req, res) => {
        res.json({ message: "Staff access granted", user: req.user });
      }
    );

    // Endpoint requiring Administrator role only
    testApp.get(
      "/test/admin-only",
      authenticateToken,
      requirePasswordChanged,
      requireRole(["Administrator"]),
      (req, res) => {
        res.json({ message: "Admin access granted", user: req.user });
      }
    );
  });

  describe("Authentication Token Guard (authenticateToken)", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const res = await request(testApp).get("/test/protected");
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Authentication token required");
    });

    it("returns 401 for malformed token", async () => {
      const res = await request(testApp)
        .get("/test/protected")
        .set("Authorization", "Bearer invalid-token-string");
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Invalid or expired token");
    });

    it("returns 403 when user is deactivated in database", async () => {
      mockUser.isActive = false;
      const token = signToken(mockUser);

      const res = await request(testApp)
        .get("/test/protected")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Account has been deactivated");
    });
  });

  describe("Mandatory Password Change Guard (requirePasswordChanged)", () => {
    it("blocks access with 403 and code PASSWORD_CHANGE_REQUIRED when mustChangePassword is true (BR-02)", async () => {
      mockUser.mustChangePassword = true;
      const token = signToken(mockUser);

      const res = await request(testApp)
        .get("/test/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
      expect(res.body.error).toContain("must change your password");
    });

    it("allows access when mustChangePassword is false", async () => {
      mockUser.mustChangePassword = false;
      const token = signToken(mockUser);

      const res = await request(testApp)
        .get("/test/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Access granted");
    });
  });

  describe("Role-Based Access Control (requireRole)", () => {
    it("forbids Requester from accessing IT Staff endpoint (returns 403)", async () => {
      mockUser.role = "Requester";
      const token = signToken(mockUser);

      const res = await request(testApp)
        .get("/test/staff-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden");
    });

    it("allows IT_Staff to access IT Staff endpoint (returns 200)", async () => {
      mockUser.role = "IT_Staff";
      const token = signToken(mockUser);

      const res = await request(testApp)
        .get("/test/staff-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Staff access granted");
    });

    it("allows Administrator to access IT Staff endpoint (returns 200)", async () => {
      mockUser.role = "Administrator";
      const token = signToken(mockUser);

      const res = await request(testApp)
        .get("/test/staff-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Staff access granted");
    });

    it("forbids IT_Staff from accessing Administrator endpoint (returns 403)", async () => {
      mockUser.role = "IT_Staff";
      const token = signToken(mockUser);

      const res = await request(testApp)
        .get("/test/admin-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden");
    });

    it("allows Administrator to access Administrator endpoint (returns 200)", async () => {
      mockUser.role = "Administrator";
      const token = signToken(mockUser);

      const res = await request(testApp)
        .get("/test/admin-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Admin access granted");
    });
  });
});
