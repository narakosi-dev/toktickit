import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { setPrisma } from "../../src/prisma.js";
import { validatePasswordStrength, signToken } from "../../src/auth.js";

describe("Lab 3: Authentication APIs (/api/auth)", () => {
  let mockUser: any;
  let mockPrisma: any;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);

    mockUser = {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.requester@toktick.local",
      role: "Requester",
      passwordHash,
      isActive: true,
      mustChangePassword: true,
    };

    mockPrisma = {
      user: {
        findFirst: async ({ where }: any) => {
          if (where?.email?.equals?.toLowerCase() === mockUser.email.toLowerCase()) {
            return mockUser;
          }
          return null;
        },
        findUnique: async ({ where }: any) => {
          if (where?.id === mockUser.id || where?.email === mockUser.email) {
            return mockUser;
          }
          return null;
        },
        update: async ({ where, data }: any) => {
          if (where.id === mockUser.id) {
            mockUser = { ...mockUser, ...data };
            return mockUser;
          }
          throw new Error("User not found");
        },
      },
    };

    setPrisma(mockPrisma);
  });

  describe("Password Complexity Validation (BR-17)", () => {
    it("rejects password shorter than 8 characters", () => {
      const res = validatePasswordStrength("Pass1!");
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("at least 8 characters");
    });

    it("rejects password missing uppercase letter", () => {
      const res = validatePasswordStrength("password123!");
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("uppercase");
    });

    it("rejects password missing lowercase letter", () => {
      const res = validatePasswordStrength("PASSWORD123!");
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("lowercase");
    });

    it("rejects password missing digit or special symbol", () => {
      const res = validatePasswordStrength("PasswordOnly");
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("number or special symbol");
    });

    it("accepts valid complex password", () => {
      const res = validatePasswordStrength("TokTick2026!");
      expect(res.valid).toBe(true);
    });
  });

  describe("POST /api/auth/login (AC-01, AC-02, AC-03, AC-04)", () => {
    it("returns 400 when email or password is missing", async () => {
      const res1 = await request(app).post("/api/auth/login").send({ email: "sarah@toktick.local" });
      expect(res1.status).toBe(400);

      const res2 = await request(app).post("/api/auth/login").send({ password: "Password123!" });
      expect(res2.status).toBe(400);
    });

    it("returns 401 with generic error for non-existent user (AC-02)", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "nonexistent@toktick.local",
        password: "Password123!",
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid email or password");
    });

    it("returns 401 for incorrect password (AC-02)", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "sarah.requester@toktick.local",
        password: "WrongPassword!",
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid email or password");
    });

    it("returns 403 Forbidden for deactivated account (AC-03, BR-03)", async () => {
      mockUser.isActive = false;

      const res = await request(app).post("/api/auth/login").send({
        email: "sarah.requester@toktick.local",
        password: "Password123!",
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("deactivated");
    });

    it("returns 200, JWT token, and profile with mustChangePassword=true for valid initial login (AC-01, AC-04)", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "sarah.requester@toktick.local",
        password: "Password123!",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toEqual({
        id: 1,
        name: "Sarah Johnson",
        email: "sarah.requester@toktick.local",
        role: "Requester",
        mustChangePassword: true,
      });
      // Ensure passwordHash is never returned to client
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });
  });

  describe("POST /api/auth/change-password (AC-05, BR-02, BR-17)", () => {
    it("returns 401 when called without Bearer token", async () => {
      const res = await request(app).post("/api/auth/change-password").send({
        currentPassword: "Password123!",
        newPassword: "NewSecurePassword2026!",
      });
      expect(res.status).toBe(401);
    });

    it("returns 400 when current password is incorrect", async () => {
      const token = signToken(mockUser);
      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "WrongCurrentPassword!",
          newPassword: "NewSecurePassword2026!",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Current password is incorrect");
    });

    it("returns 400 when new password violates complexity rules", async () => {
      const token = signToken(mockUser);
      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Password123!",
          newPassword: "weak",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("at least 8 characters");
    });

    it("successfully updates password and sets mustChangePassword to false (AC-05)", async () => {
      const token = signToken(mockUser);
      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Password123!",
          newPassword: "NewSecurePassword2026!",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.mustChangePassword).toBe(false);
      expect(res.body).toHaveProperty("token");

      // Verify that subsequent login works with new password
      const newLogin = await request(app).post("/api/auth/login").send({
        email: "sarah.requester@toktick.local",
        password: "NewSecurePassword2026!",
      });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.user.mustChangePassword).toBe(false);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("returns 200 and user payload when valid Bearer token provided", async () => {
      const token = signToken(mockUser);
      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(mockUser.email);
      expect(res.body.user.role).toBe("Requester");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("returns 200 with logout confirmation", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Logged out");
    });
  });
});
