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
        resolvedIndicated: true,
        requesterId: 1,
        assignedToId: 8,
        updatedAt: new Date("2026-10-29T09:00:00.000Z"),
        actionsTaken: mockActions,
      },
    ];

    mockLogs = [];

    setPrisma({
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id) return mockUsersMap[where.id] || null;
          return null;
        },
      },
      ticket: {
        findUnique: async ({ where }: any) => {
          const t = mockTickets.find((x) => x.id === where.id);
          return t ? { ...t } : null;
        },
        update: async ({ where, data }: any) => {
          const t = mockTickets.find((x) => x.id === where.id);
          if (!t) throw new Error("Ticket not found");
          Object.assign(t, data);
          t.updatedAt = new Date();
          return { ...t };
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
    });
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
      expect(res.body.error).toContain("status is required");
    });

    it("returns 404 Not Found for non-existent ticket", async () => {
      const res = await request(app)
        .patch("/api/tickets/999/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "In_Progress", version: 1 });
      expect(res.status).toBe(404);
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
});
