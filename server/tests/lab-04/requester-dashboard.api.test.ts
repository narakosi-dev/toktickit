import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { signToken } from "../../src/auth.js";
import { setPrisma } from "../../src/prisma.js";

describe("Lab 4: Requester Dashboard API & Ownership Isolation (requester-dashboard.api.test.ts)", () => {
  let userAToken: string;
  let userBToken: string;
  let staffToken: string;
  let adminToken: string;
  let inactiveUserToken: string;
  let mustChangePwdUserToken: string;

  const userA = {
    id: 101,
    name: "Requester Alice",
    email: "alice.requester@toktick.local",
    role: "Requester",
    isActive: true,
    mustChangePassword: false,
  };

  const userB = {
    id: 102,
    name: "Requester Bob",
    email: "bob.requester@toktick.local",
    role: "Requester",
    isActive: true,
    mustChangePassword: false,
  };

  const staffUser = {
    id: 103,
    name: "Staff Charlie",
    email: "charlie.staff@toktick.local",
    role: "IT_Staff",
    isActive: true,
    mustChangePassword: false,
  };

  const adminUser = {
    id: 104,
    name: "Admin Dave",
    email: "dave.admin@toktick.local",
    role: "Administrator",
    isActive: true,
    mustChangePassword: false,
  };

  const inactiveUser = {
    id: 105,
    name: "Inactive Requester",
    email: "inactive.requester@toktick.local",
    role: "Requester",
    isActive: false,
    mustChangePassword: false,
  };

  const mustChangePwdUser = {
    id: 106,
    name: "Pending Pwd Requester",
    email: "pending.requester@toktick.local",
    role: "Requester",
    isActive: true,
    mustChangePassword: true,
  };

  const mockCategories: Record<number, any> = {
    1: { id: 1, name: "Hardware" },
    2: { id: 2, name: "Network" },
    3: { id: 3, name: "Software" },
  };

  let mockTickets: any[] = [];
  const mockUsersMap: Record<number, any> = {
    101: userA,
    102: userB,
    103: staffUser,
    104: adminUser,
    105: inactiveUser,
    106: mustChangePwdUser,
  };

  afterAll(() => {
    setPrisma(null);
  });

  beforeEach(() => {
    userAToken = signToken(userA);
    userBToken = signToken(userB);
    staffToken = signToken(staffUser);
    adminToken = signToken(adminUser);
    inactiveUserToken = signToken(inactiveUser);
    mustChangePwdUserToken = signToken(mustChangePwdUser);

    const now = Date.now();
    const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000);
    const fortyFiveDaysAgo = new Date(now - 45 * 24 * 60 * 60 * 1000);

    // Seed dataset with User A and User B tickets
    mockTickets = [
      // --- User A Tickets ---
      // 1. New (open)
      {
        id: 201,
        ticketNumber: "TKT-2026-000201",
        summary: "Laptop keyboard broken",
        priority: "High",
        status: "New",
        resolvedIndicated: false,
        requesterId: 101,
        categoryId: 1,
        createdAt: new Date("2026-10-20T08:00:00Z"),
        updatedAt: new Date("2026-10-20T08:00:00Z"),
      },
      // 2. In_Progress (open, inProgress)
      {
        id: 202,
        ticketNumber: "TKT-2026-000202",
        summary: "WiFi disconnecting frequently",
        priority: "Medium",
        status: "In_Progress",
        resolvedIndicated: false,
        requesterId: 101,
        categoryId: 2,
        createdAt: new Date("2026-10-21T09:00:00Z"),
        updatedAt: new Date("2026-10-25T10:00:00Z"),
      },
      // 3. Waiting_for_Requester (open, waitingForRequester)
      {
        id: 203,
        ticketNumber: "TKT-2026-000203",
        summary: "Need access to internal git server",
        priority: "Critical",
        status: "Waiting_for_Requester",
        resolvedIndicated: true,
        requesterId: 101,
        categoryId: 3,
        createdAt: new Date("2026-10-22T10:00:00Z"),
        updatedAt: new Date("2026-10-26T14:00:00Z"),
      },
      // 4. Resolved (updated 5 days ago -> recentlyResolved: YES)
      {
        id: 204,
        ticketNumber: "TKT-2026-000204",
        summary: "Password reset for email",
        priority: "Low",
        status: "Resolved",
        resolvedIndicated: true,
        requesterId: 101,
        categoryId: 3,
        createdAt: new Date("2026-10-15T08:00:00Z"),
        updatedAt: fiveDaysAgo,
      },
      // 5. Resolved (updated 45 days ago -> recentlyResolved: NO)
      {
        id: 205,
        ticketNumber: "TKT-2026-000205",
        summary: "Old monitor cable replacement",
        priority: "Low",
        status: "Resolved",
        resolvedIndicated: false,
        requesterId: 101,
        categoryId: 1,
        createdAt: new Date("2026-09-01T08:00:00Z"),
        updatedAt: fortyFiveDaysAgo,
      },
      // 6. Closed (closed)
      {
        id: 206,
        ticketNumber: "TKT-2026-000206",
        summary: "Annual software audit",
        priority: "Medium",
        status: "Closed",
        resolvedIndicated: false,
        requesterId: 101,
        categoryId: 3,
        createdAt: new Date("2026-08-01T08:00:00Z"),
        updatedAt: new Date("2026-08-10T08:00:00Z"),
      },
      // 7. Cancelled (terminal -> neither open nor closed)
      {
        id: 207,
        ticketNumber: "TKT-2026-000207",
        summary: "Accidental duplicate ticket",
        priority: "Low",
        status: "Cancelled",
        resolvedIndicated: false,
        requesterId: 101,
        categoryId: 1,
        createdAt: new Date("2026-10-01T08:00:00Z"),
        updatedAt: new Date("2026-10-01T08:30:00Z"),
      },

      // --- User B Tickets (Must be completely isolated from User A) ---
      {
        id: 301,
        ticketNumber: "TKT-2026-000301",
        summary: "User B Open Ticket",
        priority: "High",
        status: "Open",
        resolvedIndicated: false,
        requesterId: 102,
        categoryId: 2,
        createdAt: new Date("2026-10-28T08:00:00Z"),
        updatedAt: new Date("2026-10-28T09:00:00Z"),
      },
      {
        id: 302,
        ticketNumber: "TKT-2026-000302",
        summary: "User B In_Progress Ticket",
        priority: "Critical",
        status: "In_Progress",
        resolvedIndicated: false,
        requesterId: 102,
        categoryId: 1,
        createdAt: new Date("2026-10-28T10:00:00Z"),
        updatedAt: new Date("2026-10-28T11:00:00Z"),
      },
      {
        id: 303,
        ticketNumber: "TKT-2026-000303",
        summary: "User B Closed Ticket",
        priority: "Low",
        status: "Closed",
        resolvedIndicated: false,
        requesterId: 102,
        categoryId: 3,
        createdAt: new Date("2026-10-10T08:00:00Z"),
        updatedAt: new Date("2026-10-12T08:00:00Z"),
      },
    ];

    const mockPrisma: any = {
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id) return mockUsersMap[where.id] || null;
          if (where.email) return Object.values(mockUsersMap).find((u) => u.email === where.email) || null;
          return null;
        },
      },
      ticket: {
        count: async ({ where }: any = {}) => {
          let list = [...mockTickets];
          if (where) {
            if (where.requesterId !== undefined) {
              list = list.filter((t) => t.requesterId === where.requesterId);
            }
            if (where.status) {
              if (typeof where.status === "string") {
                list = list.filter((t) => t.status === where.status);
              } else if (where.status.in) {
                list = list.filter((t) => where.status.in.includes(t.status));
              }
            }
            if (where.updatedAt?.gte) {
              const gteTime = new Date(where.updatedAt.gte).getTime();
              list = list.filter((t) => new Date(t.updatedAt).getTime() >= gteTime);
            }
          }
          return list.length;
        },
        findMany: async (args: any = {}) => {
          let list = [...mockTickets];

          if (args.where) {
            if (args.where.requesterId !== undefined) {
              list = list.filter((t) => t.requesterId === args.where.requesterId);
            }
            if (args.where.status) {
              if (typeof args.where.status === "string") {
                list = list.filter((t) => t.status === args.where.status);
              } else if (args.where.status.in) {
                list = list.filter((t) => args.where.status.in.includes(t.status));
              }
            }
          }

          if (args.orderBy?.updatedAt === "desc") {
            list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          }

          if (typeof args.skip === "number") {
            list = list.slice(args.skip);
          }

          if (typeof args.take === "number") {
            list = list.slice(0, args.take);
          }

          return list.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            summary: t.summary,
            priority: t.priority,
            status: t.status,
            resolvedIndicated: t.resolvedIndicated,
            updatedAt: t.updatedAt,
            category: t.categoryId ? mockCategories[t.categoryId] || null : null,
            relatedSystem: null,
            _count: { attachments: 0 },
          }));
        },
      },
    };

    setPrisma(mockPrisma);
  });

  // =========================================================================
  // Section 1: Authentication & Authorization Constraints
  // =========================================================================
  describe("Authentication & RBAC Constraints", () => {
    it("returns 401 Unauthorized when missing Authorization header", async () => {
      const res = await request(app).get("/api/dashboard/requester");
      expect(res.status).toBe(401);
    });

    it("returns 403 Forbidden when user account is inactive", async () => {
      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Authorization", `Bearer ${inactiveUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Account has been deactivated/i);
    });

    it("returns 403 Forbidden when user mustChangePassword = true", async () => {
      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Authorization", `Bearer ${mustChangePwdUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/You must change your password/i);
    });

    it("allows IT_Staff to view their personal requester dashboard", async () => {
      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics.totalOpen).toBe(0);
    });

    it("allows Administrator to view their personal requester dashboard", async () => {
      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics.totalOpen).toBe(0);
    });
  });

  // =========================================================================
  // Section 2: Metric Calculations & Strict Ownership Isolation (API-DSH-04)
  // =========================================================================
  describe("API-DSH-04: Metrics Aggregation & Ownership Isolation (BR-10 / AC-11)", () => {
    it("returns 200 OK with correct aggregated metrics strictly isolated to authenticated requester", async () => {
      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("metrics");
      expect(res.body).toHaveProperty("recentTickets");
      expect(res.body).toHaveProperty("generatedAt");

      const { metrics, recentTickets } = res.body;

      // User A calculations per BR-10:
      // totalOpen: New (201), In_Progress (202), Waiting_for_Requester (203) = 3
      expect(metrics.totalOpen).toBe(3);

      // inProgress: In_Progress (202) = 1
      expect(metrics.inProgress).toBe(1);

      // waitingForRequester: Waiting_for_Requester (203) = 1
      expect(metrics.waitingForRequester).toBe(1);

      // recentlyResolved: Resolved in last 30 days (204) = 1 (205 is 45 days old)
      expect(metrics.recentlyResolved).toBe(1);

      // closed / closedCount: Closed (206) = 1
      expect(metrics.closed).toBe(1);
      expect(metrics.closedCount).toBe(1);

      // recentTickets: max 5, ordered by updatedAt desc
      expect(recentTickets.length).toBeLessThanOrEqual(5);
      for (const t of recentTickets) {
        // Must belong only to User A (id 201..207)
        expect(t.id).toBeGreaterThanOrEqual(201);
        expect(t.id).toBeLessThanOrEqual(207);
        expect(t).toHaveProperty("ticketNumber");
        expect(t).toHaveProperty("summary");
        expect(t).toHaveProperty("priority");
        expect(t).toHaveProperty("status");
        expect(t).toHaveProperty("resolvedIndicated");
        expect(t).toHaveProperty("updatedAt");
      }
    });

    it("verifies User B receives isolated metrics and ticket lists without cross-contamination", async () => {
      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Authorization", `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      const { metrics, recentTickets } = res.body;

      // User B calculations:
      // totalOpen: Open (301), In_Progress (302) = 2
      expect(metrics.totalOpen).toBe(2);
      expect(metrics.inProgress).toBe(1);
      expect(metrics.waitingForRequester).toBe(0);
      expect(metrics.recentlyResolved).toBe(0);
      expect(metrics.closed).toBe(1);

      // Verify all tickets in recentTickets belong to User B (id 301..303)
      expect(recentTickets.length).toBe(3);
      for (const t of recentTickets) {
        expect(t.id).toBeGreaterThanOrEqual(301);
        expect(t.id).toBeLessThanOrEqual(303);
      }
    });
  });

  // =========================================================================
  // Section 3: Zero-Data State (API-DSH-05)
  // =========================================================================
  describe("API-DSH-05: Clean Zero-Data Handling", () => {
    it("returns zero counts and empty array cleanly when requester has no tickets", async () => {
      mockTickets = [];

      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toEqual({
        totalOpen: 0,
        inProgress: 0,
        waitingForRequester: 0,
        recentlyResolved: 0,
        closed: 0,
        closedCount: 0,
      });
      expect(res.body.recentTickets).toEqual([]);
      expect(res.body.generatedAt).toBeDefined();
    });
  });

  // =========================================================================
  // Section 4: GET /api/tickets Status Filter Collision Prevention (Peer Review)
  // =========================================================================
  describe("GET /api/tickets: status filter normalization without status collision", () => {
    it("status=Open filters strictly for tickets with status 'Open' (does not return other open statuses)", async () => {
      // User B has tickets: id 301 (status: 'Open'), 302 (status: 'In_Progress'), 303 (status: 'Closed')
      const res = await request(app).get("/api/tickets?requesterId=102&status=Open");
      expect(res.status).toBe(200);
      expect(res.body.tickets).toHaveLength(1);
      expect(res.body.tickets[0].id).toBe(301);
      expect(res.body.tickets[0].status).toBe("Open");
    });

    it("status=OPEN_GROUP returns all active open tickets (New, Open, In_Progress, Waiting_for_Requester, Reopened)", async () => {
      // User A open tickets: New (201), In_Progress (202), Waiting_for_Requester (203)
      const res = await request(app).get("/api/tickets?requesterId=101&status=OPEN_GROUP");
      expect(res.status).toBe(200);
      expect(res.body.tickets).toHaveLength(3);
      const statuses = res.body.tickets.map((t: any) => t.status);
      expect(statuses).toEqual(expect.arrayContaining(["New", "In_Progress", "Waiting_for_Requester"]));
      expect(statuses).not.toContain("Resolved");
      expect(statuses).not.toContain("Closed");
    });
  });
});
