import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { signToken } from "../../src/auth.js";
import { setPrisma } from "../../src/prisma.js";

describe("Lab 4: Ticket Workflow, Status Transition Matrix & Concurrency Gate (ticket-workflow.api.test.ts)", () => {
  let requesterToken: string;
  let staffToken: string;
  let adminToken: string;

  let mockTickets: any[];
  let mockActions: any[];
  let mockLogs: any[];
  let mockUsersMap: Record<number, any>;

  beforeEach(() => {
    const requester = {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.requester@toktick.local",
      role: "Requester",
      isActive: true,
      mustChangePassword: false,
    };

    const staff = {
      id: 8,
      name: "Charlie Staff",
      email: "charlie.staff@toktick.local",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: false,
    };

    const admin = {
      id: 6,
      name: "Alice Admin",
      email: "admin@toktick.local",
      role: "Administrator",
      isActive: true,
      mustChangePassword: false,
    };

    requesterToken = signToken(requester);
    staffToken = signToken(staff);
    adminToken = signToken(admin);

    mockUsersMap = {
      1: requester,
      8: staff,
      6: admin,
    };

    mockActions = [
      {
        id: 1,
        ticketId: 101,
        performedById: 8,
        actionDateTime: new Date("2026-10-29T08:00:00.000Z"),
        description: "Replaced faulty RAM module in slot 2",
        result: "Memtest86+ completed 4 passes with 0 errors",
        followUpRequired: false,
        followUpNote: null,
      },
    ];

    mockTickets = [
      // Ticket 101: In_Progress, version 2, has 1 Action Taken
      {
        id: 101,
        ticketNumber: "TCK-20260901-0001",
        status: "In_Progress",
        version: 2,
        priority: "Medium",
        itPriority: "High",
        resolvedIndicated: false,
        requesterId: 1,
        assignedToId: 8,
        updatedAt: new Date("2026-10-29T08:30:00.000Z"),
        actionsTaken: mockActions,
      },
      // Ticket 102: In_Progress, version 1, has ZERO Actions Taken
      {
        id: 102,
        ticketNumber: "TCK-20260902-0002",
        status: "In_Progress",
        version: 1,
        priority: "Low",
        itPriority: "Medium",
        resolvedIndicated: true, // Requester indicated resolution
        requesterId: 1,
        assignedToId: 8,
        updatedAt: new Date("2026-10-29T08:00:00.000Z"),
        actionsTaken: [],
      },
      // Ticket 103: New, version 1
      {
        id: 103,
        ticketNumber: "TCK-20260903-0003",
        status: "New",
        version: 1,
        priority: "Medium",
        itPriority: null,
        resolvedIndicated: false,
        requesterId: 1,
        assignedToId: null,
        updatedAt: new Date("2026-10-29T07:00:00.000Z"),
        actionsTaken: [],
      },
      // Ticket 104: Closed (Terminal state)
      {
        id: 104,
        ticketNumber: "TCK-20260904-0004",
        status: "Closed",
        version: 3,
        priority: "High",
        itPriority: "Critical",
        resolvedIndicated: true,
        requesterId: 1,
        assignedToId: 8,
        updatedAt: new Date("2026-10-28T12:00:00.000Z"),
        actionsTaken: [],
      },
      // Ticket 105: Resolved, version 2
      {
        id: 105,
        ticketNumber: "TCK-20260905-0005",
        status: "Resolved",
        version: 2,
        priority: "Medium",
        itPriority: "Medium",
        resolvedIndicated: true,
        requesterId: 1,
        assignedToId: 8,
        updatedAt: new Date("2026-10-29T09:00:00.000Z"),
        actionsTaken: mockActions,
      },
    ];

    mockLogs = [];

    const mockPrisma: any = {
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id) return mockUsersMap[where.id] || null;
          return null;
        },
      },
      ticket: {
        findUnique: async ({ where }: any) => {
          const t = mockTickets.find((x) => x.id === where.id);
          if (!t) return null;
          const actions = mockActions.filter((a) => a.ticketId === t.id);
          return {
            ...t,
            actionsTaken: actions,
            _count: { actionsTaken: actions.length },
          };
        },
        updateMany: async ({ where, data }: any) => {
          const t = mockTickets.find((x) => x.id === where.id);
          if (!t) return { count: 0 };
          if (where.version !== undefined && t.version !== where.version) {
            return { count: 0 };
          }
          if (data.version && data.version.increment !== undefined) {
            t.version += data.version.increment;
          } else if (typeof data.version === "number") {
            t.version = data.version;
          }
          if (data.status) t.status = data.status;
          if (data.assignedToId !== undefined) t.assignedToId = data.assignedToId;
          if (data.itPriority !== undefined) t.itPriority = data.itPriority;
          if (data.resolvedIndicated !== undefined) t.resolvedIndicated = data.resolvedIndicated;
          t.updatedAt = new Date();
          return { count: 1 };
        },
        update: async ({ where, data }: any) => {
          const t = mockTickets.find((x) => x.id === where.id);
          if (!t) throw new Error("Ticket not found");
          if (data.version && data.version.increment !== undefined) {
            t.version += data.version.increment;
          } else if (typeof data.version === "number") {
            t.version = data.version;
          }
          if (data.status) t.status = data.status;
          if (data.assignedToId !== undefined) t.assignedToId = data.assignedToId;
          if (data.itPriority !== undefined) t.itPriority = data.itPriority;
          if (data.resolvedIndicated !== undefined) t.resolvedIndicated = data.resolvedIndicated;
          t.updatedAt = new Date();
          const actions = mockActions.filter((a) => a.ticketId === t.id);
          return {
            ...t,
            actionsTaken: actions,
            _count: { actionsTaken: actions.length },
          };
        },
      },
      actionTaken: {
        count: async ({ where }: any) => {
          return mockActions.filter((a) => a.ticketId === where.ticketId).length;
        },
      },
      activityLog: {
        create: async ({ data }: any) => {
          const log = { id: mockLogs.length + 1, ...data, createdAt: new Date() };
          mockLogs.push(log);
          return log;
        },
      },
      $transaction: async (fnOrArray: any) => {
        if (typeof fnOrArray === "function") {
          return await fnOrArray(mockPrisma);
        }
        return Promise.all(fnOrArray);
      },
    };

    setPrisma(mockPrisma);
  });

  // ==========================================================================
  // Section 1: RBAC & Input Validation
  // ==========================================================================
  describe("Authentication & RBAC Constraints", () => {
    it("returns 401 Unauthorized when missing token", async () => {
      const res = await request(app).patch("/api/tickets/101/status").send({ status: "Resolved", version: 2 });
      expect(res.status).toBe(401);
    });

    it("returns 403 Forbidden when Requester attempts to transition ticket status", async () => {
      const res = await request(app)
        .patch("/api/tickets/101/status")
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ status: "Resolved", version: 2 });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden: insufficient permissions");
    });

    it("returns 400 Bad Request when status parameter is missing", async () => {
      const res = await request(app)
        .patch("/api/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ version: 2 });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("STATUS_REQUIRED");
      expect(res.body.error).toContain("status is required");
    });

    it("returns 400 Bad Request when version parameter is missing (AC-06 mandatory OCC)", async () => {
      const res = await request(app)
        .patch("/api/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Waiting_for_Requester" });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VERSION_REQUIRED");
      expect(res.body.error).toContain("version is required");
    });

    it("returns 404 Not Found for non-existent ticket", async () => {
      const res = await request(app)
        .patch("/api/tickets/999/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "In_Progress", version: 1 });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("TICKET_NOT_FOUND");
      expect(res.body.error).toContain("Ticket not found");
    });
  });

  // ==========================================================================
  // Section 2: Optimistic Concurrency Control (OCC) Gate (AC-06)
  // ==========================================================================
  describe("Optimistic Concurrency Control (AC-06)", () => {
    it("returns HTTP 409 Conflict when expected version does not match database version", async () => {
      // Ticket 101 current version is 2. Client provides stale version 1:
      const res = await request(app)
        .patch("/api/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Waiting_for_Requester",
          version: 1, // STALE!
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONCURRENCY_CONFLICT");
      expect(res.body.error).toContain("Conflict: Ticket has been modified concurrently");
      expect(res.body.currentVersion).toBe(2);
      expect(res.body.currentStatus).toBe("In_Progress");
      expect(res.body.updatedAt).toBeDefined();
    });

    it("returns 400 Bad Request when version is non-numeric", async () => {
      const res = await request(app)
        .patch("/api/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Waiting_for_Requester",
          version: "not-a-number",
        });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_VERSION");
      expect(res.body.error).toContain("version must be a valid integer");
    });

    it("successfully increments version from 2 to 3 upon valid transition", async () => {
      const res = await request(app)
        .patch("/api/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Waiting_for_Requester",
          version: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Waiting_for_Requester");
      expect(res.body.version).toBe(3);
      expect(res.body.previousStatus).toBe("In_Progress");
    });

    it("concurrent requests race condition: exactly one succeeds (200) and one receives 409 (CONCURRENCY_CONFLICT)", async () => {
      // Ticket 101 starts at version: 2
      // Two technicians attempt to transition simultaneously with version: 2
      const req1 = request(app)
        .patch("/api/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Waiting_for_Requester", version: 2 });

      const req2 = request(app)
        .patch("/api/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Resolved", version: 2 });

      const [res1, res2] = await Promise.all([req1, req2]);
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.code).toBe("CONCURRENCY_CONFLICT");
      expect(conflictRes.body.currentVersion).toBe(3);

      const successRes = res1.status === 200 ? res1 : res2;
      expect(successRes.body.version).toBe(3);
    });
  });

  // ==========================================================================
  // Section 3: Status Transition Matrix & Terminal States
  // ==========================================================================
  describe("Status Transition Matrix Rules", () => {
    it("returns 400 Bad Request on illegal jump from New to Resolved", async () => {
      const res = await request(app)
        .patch("/api/tickets/103/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Resolved",
          version: 1,
        });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_STATUS_TRANSITION");
      expect(res.body.error).toContain("Invalid status transition from 'New' to 'Resolved'");
      expect(res.body.details[0]).toContain("Permitted transitions from New");
    });

    it("returns 400 Bad Request when attempting to transition from terminal state Closed", async () => {
      const res = await request(app)
        .patch("/api/tickets/104/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Reopened",
          version: 3,
        });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_STATUS_TRANSITION");
      expect(res.body.error).toContain("Invalid status transition from 'Closed' to 'Reopened'");
    });

    it("allows valid transition from Resolved to Closed", async () => {
      const res = await request(app)
        .patch("/api/tickets/105/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Closed",
          version: 2,
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Closed");
      expect(res.body.version).toBe(3);
    });

    it("allows valid transition from Resolved to Reopened", async () => {
      const res = await request(app)
        .patch("/api/tickets/105/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Reopened",
          version: 2,
          comment: "User reports symptom resurfaced",
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Reopened");
      expect(res.body.version).toBe(3);
      expect(mockLogs).toHaveLength(1);
      expect(mockLogs[0].details).toContain("User reports symptom resurfaced");
    });
  });

  // ==========================================================================
  // Section 4: Resolution Invariant (BR-02, AC-07)
  // ==========================================================================
  describe("Resolution Invariant (AC-07)", () => {
    it("blocks transition to Resolved if zero Actions Taken are recorded on the ticket", async () => {
      // Ticket 102 has actionsTaken: []
      const res = await request(app)
        .patch("/api/tickets/102/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Resolved",
          version: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Cannot resolve ticket without at least one recorded Action Taken");
      expect(res.body.code).toBe("ACTION_TAKEN_REQUIRED");
    });

    it("allows transition to Resolved when at least one Action Taken exists", async () => {
      // Ticket 101 has 1 action taken in mockActions
      const res = await request(app)
        .patch("/api/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Resolved",
          version: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Resolved");
      expect(res.body.version).toBe(3);
    });

    it("legacy endpoint PATCH /api/staff/tickets/:id/status directly enforces resolution gate (ACTION_TAKEN_REQUIRED) if zero actions exist", async () => {
      // Ticket 102 has 0 actions taken
      const res = await request(app)
        .patch("/api/staff/tickets/102/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Resolved",
          version: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("ACTION_TAKEN_REQUIRED");
      expect(res.body.error).toContain("Cannot resolve ticket without at least one recorded Action Taken");
    });

    it("legacy endpoint PATCH /api/staff/tickets/:id/status allows resolution when actions taken exist", async () => {
      // Ticket 101 has 1 action taken
      const res = await request(app)
        .patch("/api/staff/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Resolved",
          version: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Resolved");
    });
  });

  // ==========================================================================
  // Section 5: Advisory Indication Flag (AC-08)
  // ==========================================================================
  describe("Advisory Resolution Indication (AC-08)", () => {
    it("preserves and returns resolvedIndicated flag in response payload", async () => {
      // Ticket 102 has resolvedIndicated: true
      const res = await request(app)
        .patch("/api/tickets/102/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "Waiting_for_Requester",
          version: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.resolvedIndicated).toBe(true);
    });
  });

  // ==========================================================================
  // Section 6: Version Incrementation Scope Across Mutating Endpoints
  // ==========================================================================
  describe("Version Incrementation Scope Across Mutating Endpoints", () => {
    it("PATCH /api/staff/tickets/:id/assign increments ticket version", async () => {
      const initialVersion = mockTickets.find((t) => t.id === 101).version;
      const res = await request(app)
        .patch("/api/staff/tickets/101/assign")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ staffId: 8 });

      expect(res.status).toBe(200);
      const updated = mockTickets.find((t) => t.id === 101);
      expect(updated.version).toBe(initialVersion + 1);
    });

    it("PATCH /api/staff/tickets/:id/priority increments ticket version", async () => {
      const initialVersion = mockTickets.find((t) => t.id === 101).version;
      const res = await request(app)
        .patch("/api/staff/tickets/101/priority")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "Critical" });

      expect(res.status).toBe(200);
      const updated = mockTickets.find((t) => t.id === 101);
      expect(updated.version).toBe(initialVersion + 1);
    });

    it("POST /api/tickets/:id/resolve-indication increments ticket version", async () => {
      const initialVersion = mockTickets.find((t) => t.id === 101).version;
      const res = await request(app)
        .post("/api/tickets/101/resolve-indication")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      const updated = mockTickets.find((t) => t.id === 101);
      expect(updated.version).toBe(initialVersion + 1);
    });
  });
});
