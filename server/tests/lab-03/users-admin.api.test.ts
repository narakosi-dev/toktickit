import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { signToken } from "../../src/auth.js";
import { setPrisma } from "../../src/prisma.js";

describe("Lab 3: Administrator User Management API (users-admin.api.test.ts)", () => {
  let adminUser: any;
  let secondAdminUser: any;
  let staffUser: any;
  let requesterUser: any;
  let mustChangePasswordAdmin: any;

  let adminToken: string;
  let secondAdminToken: string;
  let staffToken: string;
  let requesterToken: string;
  let mustChangePasswordToken: string;

  let mockUsers: any[];

  beforeEach(() => {
    adminUser = {
      id: 1,
      name: "Super Admin",
      email: "admin@toktickit.com",
      role: "Administrator",
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date("2026-09-19T00:00:00.000Z"),
      updatedAt: new Date("2026-09-19T00:00:00.000Z"),
    };

    secondAdminUser = {
      id: 2,
      name: "Second Admin",
      email: "second.admin@toktickit.com",
      role: "Administrator",
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date("2026-09-19T01:00:00.000Z"),
      updatedAt: new Date("2026-09-19T01:00:00.000Z"),
    };

    staffUser = {
      id: 3,
      name: "Michael Brown",
      email: "michael.brown@toktickit.com",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date("2026-09-19T02:00:00.000Z"),
      updatedAt: new Date("2026-09-19T02:00:00.000Z"),
    };

    requesterUser = {
      id: 4,
      name: "Alice Requester",
      email: "alice@example.com",
      role: "Requester",
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date("2026-09-19T03:00:00.000Z"),
      updatedAt: new Date("2026-09-19T03:00:00.000Z"),
    };

    mustChangePasswordAdmin = {
      id: 5,
      name: "Pending Staff",
      email: "pending.staff@toktickit.com",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date("2026-09-19T04:00:00.000Z"),
      updatedAt: new Date("2026-09-19T04:00:00.000Z"),
    };

    adminToken = signToken(adminUser);
    secondAdminToken = signToken(secondAdminUser);
    staffToken = signToken(staffUser);
    requesterToken = signToken(requesterUser);
    mustChangePasswordToken = signToken(mustChangePasswordAdmin);

    mockUsers = [
      { ...adminUser },
      { ...secondAdminUser },
      { ...staffUser },
      { ...requesterUser },
      { ...mustChangePasswordAdmin },
    ];

    setPrisma({
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id) {
            return mockUsers.find((u) => u.id === where.id) || null;
          }
          if (where.email) {
            return mockUsers.find((u) => u.email.toLowerCase() === where.email.toLowerCase()) || null;
          }
          return null;
        },
        findFirst: async ({ where }: any) => {
          return (
            mockUsers.find((u) => {
              if (where.email?.equals) {
                const matchEmail = u.email.toLowerCase() === where.email.equals.toLowerCase();
                if (!matchEmail) return false;
              }
              if (where.NOT?.id) {
                if (u.id === where.NOT.id) return false;
              }
              return true;
            }) || null
          );
        },
        findMany: async ({ where }: any) => {
          let list = [...mockUsers];
          if (where?.role) {
            list = list.filter((u) => u.role === where.role);
          }
          if (where?.isActive !== undefined) {
            list = list.filter((u) => u.isActive === where.isActive);
          }
          if (where?.OR) {
            list = list.filter((u) => {
              return where.OR.some((cond: any) => {
                if (cond.name?.contains) {
                  return u.name.toLowerCase().includes(cond.name.contains.toLowerCase());
                }
                if (cond.email?.contains) {
                  return u.email.toLowerCase().includes(cond.email.contains.toLowerCase());
                }
                return false;
              });
            });
          }
          return list;
        },
        count: async ({ where }: any) => {
          let list = [...mockUsers];
          if (where?.role) {
            list = list.filter((u) => u.role === where.role);
          }
          if (where?.isActive !== undefined) {
            list = list.filter((u) => u.isActive === where.isActive);
          }
          return list.length;
        },
        create: async ({ data }: any) => {
          const newUser = {
            id: mockUsers.length + 1,
            name: data.name,
            email: data.email,
            role: data.role,
            passwordHash: data.passwordHash,
            isActive: data.isActive !== undefined ? data.isActive : true,
            mustChangePassword: data.mustChangePassword !== undefined ? data.mustChangePassword : true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockUsers.push(newUser);
          return newUser;
        },
        update: async ({ where, data }: any) => {
          const user = mockUsers.find((u) => u.id === where.id);
          if (!user) throw new Error("User not found");
          Object.assign(user, data, { updatedAt: new Date() });
          return user;
        },
      },
    });
  });

  describe("RBAC Guards on /api/admin/users", () => {
    it("TC-RBAC-03: Requester calling GET /api/admin/users receives HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden");
    });

    it("TC-RBAC-05: IT Staff calling GET /api/admin/users receives HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden");
    });

    it("TC-RBAC-06: Administrator calling GET /api/admin/users receives HTTP 200 OK", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("User with mustChangePassword=true is blocked with 403 PASSWORD_CHANGE_REQUIRED", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${mustChangePasswordToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });
  });

  describe("TC-ADMIN-01: List Users", () => {
    it("returns full list of users with roles, status, and created dates (no password hashes)", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);

      const firstUser = res.body[0];
      expect(firstUser).toHaveProperty("id");
      expect(firstUser).toHaveProperty("name");
      expect(firstUser).toHaveProperty("email");
      expect(firstUser).toHaveProperty("role");
      expect(firstUser).toHaveProperty("isActive");
      expect(firstUser).toHaveProperty("active");
      expect(firstUser).toHaveProperty("mustChangePassword");
      expect(firstUser).toHaveProperty("createdAt");
      // Password hash must never leak
      expect(firstUser).not.toHaveProperty("passwordHash");
    });
  });

  describe("TC-ADMIN-02: Filter Users by Role", () => {
    it("GET /api/admin/users?role=IT_Staff returns only IT Staff users", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=IT_Staff")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.every((u: any) => u.role === "IT_Staff")).toBe(true);
    });
  });

  describe("TC-ADMIN-03: Filter Users by Search Term", () => {
    it("GET /api/admin/users?search=alice filters users by name or email", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=alice")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe("Alice Requester");
    });
  });

  describe("TC-ADMIN-04 & TC-ADMIN-05: Create User", () => {
    it("creates a new user, sets mustChangePassword: true, and returns HTTP 201 with temporary password", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "David Davidson",
          email: "david.d@example.com",
          role: "IT_Staff",
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("David Davidson");
      expect(res.body.email).toBe("david.d@example.com");
      expect(res.body.role).toBe("IT_Staff");
      expect(res.body.isActive).toBe(true);
      expect(res.body.mustChangePassword).toBe(true);
      expect(res.body.temporaryPassword).toBeDefined();
      expect(res.body.temporaryPassword.length).toBeGreaterThanOrEqual(8);
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("creates user with provided initialPassword when specified", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Emma Stone",
          email: "emma.s@example.com",
          role: "Requester",
          initialPassword: "CustomPassword123!",
        });

      expect(res.status).toBe(201);
      expect(res.body.temporaryPassword).toBe("CustomPassword123!");
      expect(res.body.mustChangePassword).toBe(true);
    });

    it("rejects user creation when initialPassword is less than 8 characters (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Short Pwd",
          email: "short.pwd@example.com",
          role: "Requester",
          initialPassword: "short",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("at least 8 characters");
    });

    it("TC-ADMIN-05: rejects duplicate email with HTTP 409 Conflict (BR-12)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate User",
          email: "alice@example.com", // Already exists
          role: "Requester",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("already registered");
    });
  });

  describe("TC-ADMIN-06, TC-ADMIN-07 & TC-ADMIN-08: Edit User & Invariants", () => {
    it("TC-ADMIN-06: updates user name, role, and active status", async () => {
      const res = await request(app)
        .patch("/api/admin/users/4")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Alice Updated",
          role: "IT_Staff",
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Alice Updated");
      expect(res.body.role).toBe("IT_Staff");
    });

    it("TC-ADMIN-07: Admin calling PATCH to deactivate own account returns HTTP 400 (BR-13)", async () => {
      const res = await request(app)
        .patch("/api/admin/users/1") // Admin user id is 1
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          active: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("cannot deactivate your own account");
    });

    it("TC-ADMIN-08: Admin calling PATCH to deactivate last active admin returns HTTP 400 (BR-14)", async () => {
      // Deactivate secondAdminUser first so only 1 active admin remains
      const secondAdmin = mockUsers.find((u) => u.id === 2);
      secondAdmin.isActive = false;

      // Now attempt to deactivate adminUser (id 1) using another token or attempt
      // Even if another caller tries to deactivate the sole active admin:
      const res = await request(app)
        .patch("/api/admin/users/1")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          active: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot deactivate.*active Administrator/i);
    });

    it("rejects changing role away from Administrator for the last active Administrator (400)", async () => {
      // Deactivate secondAdminUser first
      const secondAdmin = mockUsers.find((u) => u.id === 2);
      secondAdmin.isActive = false;

      // Attempt to demote sole active admin to IT_Staff
      const res = await request(app)
        .patch("/api/admin/users/1")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          role: "IT_Staff",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot deactivate or change role.*last active Administrator/i);
    });

    it("returns 404 when updating non-existent user", async () => {
      const res = await request(app)
        .patch("/api/admin/users/9999")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Ghost" });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });

  describe("TC-ADMIN-09: Hard Deletion Forbidden (BR-15)", () => {
    it("calling DELETE /api/admin/users/:id returns HTTP 405 Method Not Allowed", async () => {
      const res = await request(app)
        .delete("/api/admin/users/4")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(405);
      expect(res.body.error).toContain("Hard delete is forbidden");
    });
  });

  describe("TC-ADMIN-10: Reset User Password (BR-16)", () => {
    it("generates temporary password, hashes it, sets mustChangePassword: true, and returns HTTP 200", async () => {
      const res = await request(app)
        .post("/api/admin/users/4/reset-password")
        .set("Authorization", `Bearer ${adminToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Initial password reset successfully");
      expect(res.body.temporaryPassword).toBeDefined();
      expect(res.body.temporaryPassword.length).toBeGreaterThanOrEqual(8);
      expect(res.body.mustChangePassword).toBe(true);

      const target = mockUsers.find((u) => u.id === 4);
      expect(target.mustChangePassword).toBe(true);
      expect(target.passwordHash).toBeDefined();
    });

    it("resets password using specified newInitialPassword", async () => {
      const res = await request(app)
        .post("/api/admin/users/4/reset-password")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          newInitialPassword: "NewTempPassword999!",
        });

      expect(res.status).toBe(200);
      expect(res.body.temporaryPassword).toBe("NewTempPassword999!");
      expect(res.body.mustChangePassword).toBe(true);
    });

    it("returns 404 when resetting password for non-existent user", async () => {
      const res = await request(app)
        .post("/api/admin/users/9999/reset-password")
        .set("Authorization", `Bearer ${adminToken}`)
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });
});
