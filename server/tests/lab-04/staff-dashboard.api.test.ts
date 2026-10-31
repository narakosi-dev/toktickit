import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { signToken } from "../../src/auth.js";
import { setPrisma } from "../../src/prisma.js";

describe("Lab 4: IT Staff & Administrator Dashboard APIs (staff-dashboard.api.test.ts)", () => {
  let requesterToken: string;
  let staffCharlieToken: string;
  let staffBobToken: string;
  let adminAliceToken: string;
  let inactiveStaffToken: string;
  let mustChangePwdStaffToken: string;

  const requesterUser = {
    id: 1,
    name: "Sarah Requester",
    email: "sarah.requester@toktick.local",
    role: "Requester",
    isActive: true,
    mustChangePassword: false,
  };

  const staffCharlie = {
    id: 8,
    name: "Charlie Staff",
    email: "charlie.staff@toktick.local",
    role: "IT_Staff",
    isActive: true,
    mustChangePassword: false,
  };

  const staffBob = {
    id: 9,
    name: "Bob Staff",
    email: "bob.staff@toktick.local",
    role: "IT_Staff",
    isActive: true,
    mustChangePassword: false,
  };

  const adminAlice = {
    id: 10,
    name: "Alice Admin",
    email: "alice.admin@toktick.local",
    role: "Administrator",
    isActive: true,
    mustChangePassword: false,
  };

  const inactiveStaff = {
    id: 11,
    name: "Inactive Staff",
    email: "inactive.staff@toktick.local",
    role: "IT_Staff",
    isActive: false,
    mustChangePassword: false,
  };

  const mustChangePwdStaff = {
    id: 12,
    name: "Pending Pwd Staff",
    email: "pending.staff@toktick.local",
    role: "IT_Staff",
    isActive: true,
    mustChangePassword: true,
  };

  let mockTickets: any[] = [];
  const mockUsersMap: Record<number, any> = {
    1: requesterUser,
    8: staffCharlie,
    9: staffBob,
    10: adminAlice,
    11: inactiveStaff,
    12: mustChangePwdStaff,
  };

  afterAll(() => {
    // Reset prisma client to prevent test pollution
    setPrisma(null);
  });

  beforeEach(() => {
    requesterToken = signToken(requesterUser);
    staffCharlieToken = signToken(staffCharlie);
    staffBobToken = signToken(staffBob);
    adminAliceToken = signToken(adminAlice);
    inactiveStaffToken = signToken(inactiveStaff);
    mustChangePwdStaffToken = signToken(mustChangePwdStaff);

    // Seed diverse ticket dataset to verify BR-11 and AC-10
    mockTickets = [
      // 1. New, Unassigned, Priority: High, itPriority: null
      {
        id: 101,
        ticketNumber: "TKT-2026-000101",
        summary: "Cannot access internal network",
        priority: "High",
        itPriority: null,
        status: "New",
        assignedToId: null,
        requesterId: 1,
        createdAt: new Date("2026-10-25T08:00:00Z"),
        updatedAt: new Date("2026-10-25T08:00:00Z"),
      },
      // 2. Open, Unassigned, Priority: Critical, itPriority: null -> Urgent ticket candidate (oldest)
      {
        id: 102,
        ticketNumber: "TKT-2026-000102",
        summary: "Core router link down",
        priority: "Critical",
        itPriority: null,
        status: "Open",
        assignedToId: null,
        requesterId: 1,
        createdAt: new Date("2026-10-26T09:00:00Z"),
        updatedAt: new Date("2026-10-29T10:00:00Z"),
      },
      // 3. In_Progress, Assigned to Charlie (8), Priority: Low, itPriority: Critical (Staff override to Critical) -> Urgent
      {
        id: 103,
        ticketNumber: "TKT-2026-000103",
        summary: "Database query timeout",
        priority: "Low",
        itPriority: "Critical",
        status: "In_Progress",
        assignedToId: 8,
        requesterId: 1,
        createdAt: new Date("2026-10-27T10:00:00Z"),
        updatedAt: new Date("2026-10-29T11:00:00Z"),
      },
      // 4. In_Progress, Assigned to Charlie (8), Priority: Medium, itPriority: null
      {
        id: 104,
        ticketNumber: "TKT-2026-000104",
        summary: "Printer toner empty",
        priority: "Medium",
        itPriority: null,
        status: "In_Progress",
        assignedToId: 8,
        requesterId: 1,
        createdAt: new Date("2026-10-28T07:00:00Z"),
        updatedAt: new Date("2026-10-28T07:30:00Z"),
      },
      // 5. Waiting_for_Requester, Assigned to Bob (9), Priority: Critical, itPriority: Low (Override down to Low)
      {
        id: 105,
        ticketNumber: "TKT-2026-000105",
        summary: "Mouse cursor flickering",
        priority: "Critical",
        itPriority: "Low",
        status: "Waiting_for_Requester",
        assignedToId: 9,
        requesterId: 1,
        createdAt: new Date("2026-10-28T11:00:00Z"),
        updatedAt: new Date("2026-10-28T12:00:00Z"),
      },
      // 6. Resolved, Assigned to Charlie (8), Priority: Medium, itPriority: null
      {
        id: 106,
        ticketNumber: "TKT-2026-000106",
        summary: "Software license expired",
        priority: "Medium",
        itPriority: null,
        status: "Resolved",
        assignedToId: 8,
        requesterId: 1,
        createdAt: new Date("2026-10-28T14:00:00Z"),
        updatedAt: new Date("2026-10-29T14:00:00Z"),
      },
      // 7. Reopened, Unassigned, Priority: High, itPriority: Critical -> Urgent
      {
        id: 107,
        ticketNumber: "TKT-2026-000107",
        summary: "Email sync issue returned",
        priority: "High",
        itPriority: "Critical",
        status: "Reopened",
        assignedToId: null,
        requesterId: 1,
        createdAt: new Date("2026-10-29T08:00:00Z"),
        updatedAt: new Date("2026-10-29T09:00:00Z"),
      },
      // 8. Closed, Assigned to Charlie (8), Priority: Critical (Terminal -> Must not count in unassigned, myAssigned, priority, urgent)
      {
        id: 108,
        ticketNumber: "TKT-2026-000108",
        summary: "Old completed ticket",
        priority: "Critical",
        itPriority: null,
        status: "Closed",
        assignedToId: 8,
        requesterId: 1,
        createdAt: new Date("2026-10-20T08:00:00Z"),
        updatedAt: new Date("2026-10-22T08:00:00Z"),
      },
      // 9. Cancelled, Unassigned, Priority: Critical (Terminal -> Must not count in unassigned, myAssigned, priority, urgent)
      {
        id: 109,
        ticketNumber: "TKT-2026-000109",
        summary: "Duplicate ticket cancelled",
        priority: "Critical",
        itPriority: null,
        status: "Cancelled",
        assignedToId: null,
        requesterId: 1,
        createdAt: new Date("2026-10-21T08:00:00Z"),
        updatedAt: new Date("2026-10-21T09:00:00Z"),
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
            if (where.status?.notIn) {
              list = list.filter((t) => !where.status.notIn.includes(t.status));
            }
            if (where.assignedToId === null) {
              list = list.filter((t) => t.assignedToId === null || t.assignedToId === undefined);
            } else if (where.assignedToId !== undefined) {
              list = list.filter((t) => t.assignedToId === where.assignedToId);
            }
          }
          return list.length;
        },
        groupBy: async (args: any = {}) => {
          let list = [...mockTickets];
          if (args.where?.status?.notIn) {
            list = list.filter((t) => !args.where.status.notIn.includes(t.status));
          }
          const byFields: string[] = args.by || [];
          const groups: Record<string, { group: any; count: number }> = {};

          for (const t of list) {
            const key = byFields.map((f) => String(t[f] ?? "null")).join("___");
            if (!groups[key]) {
              const groupObj: any = {};
              for (const f of byFields) {
                groupObj[f] = t[f] ?? null;
              }
              groups[key] = { group: groupObj, count: 0 };
            }
            groups[key].count++;
          }

          return Object.values(groups).map(({ group, count }) => ({
            ...group,
            _count: {
              ...group,
              _all: count,
              status: count,
              priority: count,
            },
          }));
        },
        findMany: async (args: any = {}) => {
          let list = [...mockTickets];

          // Handle where filters including real OR conditions
          if (args.where) {
            if (args.where.status?.notIn) {
              const excluded = args.where.status.notIn;
              list = list.filter((t) => !excluded.includes(t.status));
            }
            if (args.where.OR) {
              list = list.filter((t) => {
                return args.where.OR.some((cond: any) => {
                  let match = true;
                  if (cond.itPriority !== undefined) {
                    match =
                      match &&
                      (cond.itPriority === null
                        ? t.itPriority === null || t.itPriority === undefined
                        : t.itPriority === cond.itPriority);
                  }
                  if (cond.priority !== undefined) {
                    match = match && t.priority === cond.priority;
                  }
                  return match;
                });
              });
            }
          }

          // Handle orderBy
          if (args.orderBy?.createdAt === "asc") {
            list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          } else if (args.orderBy?.updatedAt === "desc") {
            list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          }

          // Handle take
          if (typeof args.take === "number") {
            list = list.slice(0, args.take);
          }

          // Return formatted records
          return list.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            summary: t.summary,
            priority: t.priority,
            itPriority: t.itPriority,
            status: t.status,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            requester: t.requesterId
              ? { id: t.requesterId, name: mockUsersMap[t.requesterId]?.name || "Unknown" }
              : null,
            assignedTo: t.assignedToId
              ? { id: t.assignedToId, name: mockUsersMap[t.assignedToId]?.name || "Unknown" }
              : null,
          }));
        },
      },
    };

    setPrisma(mockPrisma);
  });

  // =========================================================================
  // Section 1: Authentication & Authorization Constraints (API-DSH-03)
  // =========================================================================
  describe("Authentication & RBAC Constraints (API-DSH-03)", () => {
    it("returns 401 Unauthorized when missing Authorization header", async () => {
      const res = await request(app).get("/api/dashboard/staff");
      expect(res.status).toBe(401);
    });

    it("API-DSH-03: returns 403 Forbidden when Requester attempts to access Staff Dashboard API", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden: Access is denied/i);
    });

    it("returns 403 Forbidden when user has mustChangePassword = true", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${mustChangePwdStaffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/You must change your password/i);
    });

    it("returns 403 Forbidden when user account is inactive", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${inactiveStaffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Account has been deactivated/i);
    });
  });

  // =========================================================================
  // Section 2: Aggregated Operational Metrics (API-DSH-01 / BR-11 / AC-10)
  // =========================================================================
  describe("Operational Dashboard Metrics Aggregation (API-DSH-01 / AC-10 / BR-11)", () => {
    it("returns 200 OK with correct aggregated metrics for IT Staff", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${staffCharlieToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("metrics");
      expect(res.body.generatedAt).toBeDefined();
      const { metrics } = res.body;

      // Active unassigned tickets:
      // TKT-101 (New, null), TKT-102 (Open, null), TKT-107 (Reopened, null)
      // Excluded: TKT-109 (Cancelled)
      expect(metrics.unassignedCount).toBe(3);

      // Active tickets assigned to Charlie (id: 8):
      // TKT-103 (In_Progress, 8), TKT-104 (In_Progress, 8), TKT-106 (Resolved, 8)
      // Excluded: TKT-108 (Closed, 8)
      expect(metrics.myAssignedCount).toBe(3);

      // Status breakdown (active statuses per BR-11):
      expect(metrics.statusBreakdown).toEqual({
        New: 1,
        Open: 1,
        In_Progress: 2,
        Waiting_for_Requester: 1,
        Resolved: 1,
        Reopened: 1,
      });

      // Status counts breakdown (full status counts):
      expect(metrics.statusCounts).toEqual({
        New: 1,
        Open: 1,
        In_Progress: 2,
        Waiting_for_Requester: 1,
        Resolved: 1,
        Reopened: 1,
        Closed: 1,
        Cancelled: 1,
      });

      // Priority breakdown (Active tickets only, using effective priority per BR-11):
      // Active tickets:
      // TKT-101: itPriority null, priority High -> High
      // TKT-102: itPriority null, priority Critical -> Critical
      // TKT-103: itPriority Critical, priority Low -> Critical (override)
      // TKT-104: itPriority null, priority Medium -> Medium
      // TKT-105: itPriority Low, priority Critical -> Low (override)
      // TKT-106: itPriority null, priority Medium -> Medium
      // TKT-107: itPriority Critical, priority High -> Critical (override)
      // Total active: Critical: 3 (102, 103, 107), High: 1 (101), Medium: 2 (104, 106), Low: 1 (105)
      expect(metrics.priorityBreakdown).toEqual({
        Critical: 3,
        High: 1,
        Medium: 2,
        Low: 1,
      });
      expect(metrics.priorityCounts).toEqual({
        Critical: 3,
        High: 1,
        Medium: 2,
        Low: 1,
      });
    });

    it("accurately calculates myAssignedCount relative to different logged-in IT Staff (Bob id: 9)", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${staffBobToken}`);

      expect(res.status).toBe(200);
      // Bob has TKT-105 assigned (Waiting_for_Requester)
      expect(res.body.metrics.myAssignedCount).toBe(1);
      // Unassigned count is queue-wide, remains 3
      expect(res.body.metrics.unassignedCount).toBe(3);
    });

    it("allows Administrator to access Staff Dashboard and view operational metrics", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${adminAliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics.unassignedCount).toBe(3);
      // Admin (id: 10) has 0 assigned tickets
      expect(res.body.metrics.myAssignedCount).toBe(0);
    });
  });

  // =========================================================================
  // Section 3: Urgent Tickets List & Sorting (API-DSH-02 / BR-11)
  // =========================================================================
  describe("Urgent Tickets Retrieval & Ordering (API-DSH-02)", () => {
    it("returns top 5 critical active tickets sorted by createdAt ASC (oldest first)", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${staffCharlieToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("urgentTickets");
      const { urgentTickets } = res.body;

      // 3 active critical tickets:
      // TKT-102 (2026-10-26), TKT-103 (2026-10-27), TKT-107 (2026-10-29)
      // Excluded: TKT-108 (Closed), TKT-109 (Cancelled), TKT-105 (itPriority override to Low)
      expect(urgentTickets.length).toBe(3);
      expect(urgentTickets[0].ticketNumber).toBe("TKT-2026-000102");
      expect(urgentTickets[1].ticketNumber).toBe("TKT-2026-000103");
      expect(urgentTickets[2].ticketNumber).toBe("TKT-2026-000107");

      // Verify ticket structure satisfies contract
      const firstUrgent = urgentTickets[0];
      expect(firstUrgent).toMatchObject({
        id: 102,
        ticketNumber: "TKT-2026-000102",
        summary: "Core router link down",
        priority: "Critical",
        status: "Open",
      });
      expect(firstUrgent.requester).toEqual({ id: 1, name: "Sarah Requester" });
      expect(firstUrgent.assignedTo).toBeNull();
      expect(firstUrgent.createdAt).toBeDefined();
    });

    it("verifies recentUpdatedTickets list returns top 5 tickets sorted by updatedAt DESC", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${staffCharlieToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("recentUpdatedTickets");
      const { recentUpdatedTickets } = res.body;

      expect(recentUpdatedTickets.length).toBeLessThanOrEqual(5);
      // TKT-106 had updatedAt 2026-10-29T14:00:00Z (latest)
      expect(recentUpdatedTickets[0].ticketNumber).toBe("TKT-2026-000106");
      expect(recentUpdatedTickets[0].requester).toBeDefined();
      expect(recentUpdatedTickets[0].updatedAt).toBeDefined();
    });
  });

  // =========================================================================
  // Section 4: Boundary & Empty State Behavior
  // =========================================================================
  describe("Boundary & Zero-Data Handling", () => {
    it("returns zero counts and empty arrays gracefully when no tickets exist in DB", async () => {
      mockTickets = [];

      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${staffCharlieToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics.unassignedCount).toBe(0);
      expect(res.body.metrics.myAssignedCount).toBe(0);
      expect(res.body.metrics.statusBreakdown).toEqual({
        New: 0,
        Open: 0,
        In_Progress: 0,
        Waiting_for_Requester: 0,
        Resolved: 0,
        Reopened: 0,
      });
      expect(res.body.metrics.statusCounts).toEqual({
        New: 0,
        Open: 0,
        In_Progress: 0,
        Waiting_for_Requester: 0,
        Resolved: 0,
        Reopened: 0,
        Closed: 0,
        Cancelled: 0,
      });
      expect(res.body.metrics.priorityBreakdown).toEqual({
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
      });
      expect(res.body.metrics.priorityCounts).toEqual({
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
      });
      expect(res.body.urgentTickets).toEqual([]);
      expect(res.body.recentUpdatedTickets).toEqual([]);
    });
  });
});
