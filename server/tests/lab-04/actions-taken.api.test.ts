import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { signToken } from "../../src/auth.js";
import { setPrisma } from "../../src/prisma.js";

describe("Lab 4: Actions Taken REST APIs & Role Authorization (actions-taken.api.test.ts)", () => {
  let requester1: any;
  let requester2: any;
  let staffCharlie: any;
  let staffBob: any;
  let adminAlice: any;
  let inactiveStaff: any;
  let mustChangePwdUser: any;

  let requester1Token: string;
  let requester2Token: string;
  let staffCharlieToken: string;
  let staffBobToken: string;
  let adminAliceToken: string;
  let inactiveToken: string;
  let mustChangePwdToken: string;

  let mockTickets: any[];
  let mockActions: any[];
  let mockLogs: any[];
  let mockUsersMap: Record<number, any>;

  beforeEach(() => {
    requester1 = {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.requester@toktick.local",
      role: "Requester",
      isActive: true,
      mustChangePassword: false,
    };

    requester2 = {
      id: 2,
      name: "Alice Johnson",
      email: "alice.johnson@example.com",
      role: "Requester",
      isActive: true,
      mustChangePassword: false,
    };

    staffCharlie = {
      id: 8,
      name: "Charlie Staff",
      email: "charlie.staff@toktick.local",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: false,
    };

    staffBob = {
      id: 9,
      name: "Bob Smith",
      email: "bob.smith@example.com",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: false,
    };

    adminAlice = {
      id: 6,
      name: "Alice Admin",
      email: "admin@toktick.local",
      role: "Administrator",
      isActive: true,
      mustChangePassword: false,
    };

    inactiveStaff = {
      id: 16,
      name: "Retired Staff",
      email: "retired.staff@toktick.local",
      role: "IT_Staff",
      isActive: false,
      mustChangePassword: false,
    };

    mustChangePwdUser = {
      id: 10,
      name: "Bob Support",
      email: "bob.staff@toktick.local",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: true,
    };

    requester1Token = signToken(requester1);
    requester2Token = signToken(requester2);
    staffCharlieToken = signToken(staffCharlie);
    staffBobToken = signToken(staffBob);
    adminAliceToken = signToken(adminAlice);
    inactiveToken = signToken(inactiveStaff);
    mustChangePwdToken = signToken(mustChangePwdUser);

    mockUsersMap = {
      1: requester1,
      2: requester2,
      6: adminAlice,
      8: staffCharlie,
      9: staffBob,
      10: mustChangePwdUser,
      16: inactiveStaff,
    };

    mockActions = [
      {
        id: 1,
        ticketId: 101,
        performedById: 8,
        actionDateTime: new Date("2026-10-29T08:00:00.000Z"),
        description: "Investigated network gateway logs for packet loss",
        result: "Confirmed MTU fragmentation on interface vlan100",
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: "pcap_trace.log",
        createdAt: new Date("2026-10-29T08:05:00.000Z"),
        updatedAt: new Date("2026-10-29T08:05:00.000Z"),
        performedBy: staffCharlie,
      },
      {
        id: 2,
        ticketId: 101,
        performedById: 9,
        actionDateTime: new Date("2026-10-29T09:30:00.000Z"),
        description: "Adjusted router MSS clamping to 1360 bytes",
        result: "Packet drop reduced from 14% to 0.1%",
        followUpRequired: true,
        followUpNote: "Request requester to test streaming video over VPN",
        attachmentNotes: null,
        createdAt: new Date("2026-10-29T09:35:00.000Z"),
        updatedAt: new Date("2026-10-29T09:35:00.000Z"),
        performedBy: staffBob,
      },
    ];

    mockTickets = [
      {
        id: 101,
        ticketNumber: "TCK-20260901-0001",
        summary: "VPN disconnecting intermittently during peak hours",
        description: "Connection drops every 5-10 minutes",
        priority: "High",
        itPriority: "High",
        status: "In_Progress",
        version: 3,
        resolvedIndicated: false,
        requesterId: 1, // owned by Sarah Johnson
        assignedToId: 8,
      },
      {
        id: 102,
        ticketNumber: "TCK-20260902-0002",
        summary: "Laptop battery draining in less than 45 minutes",
        description: "Battery drops rapidly",
        priority: "Medium",
        itPriority: "Medium",
        status: "Open",
        version: 1,
        resolvedIndicated: false,
        requesterId: 2, // owned by Alice Johnson
        assignedToId: 9,
      },
    ];

    mockLogs = [];

    // Mock Prisma Client
    setPrisma({
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id) return mockUsersMap[where.id] || null;
          if (where.email) {
            return Object.values(mockUsersMap).find((u: any) => u.email === where.email) || null;
          }
          return null;
        },
      },
      ticket: {
        findUnique: async ({ where }: any) => {
          const t = mockTickets.find((x) => x.id === where.id);
          return t ? { ...t } : null;
        },
      },
      actionTaken: {
        findMany: async ({ where, orderBy }: any) => {
          let list = mockActions.filter((a) => a.ticketId === where.ticketId);
          if (orderBy?.actionDateTime === "asc") {
            list = [...list].sort(
              (a, b) => new Date(a.actionDateTime).getTime() - new Date(b.actionDateTime).getTime()
            );
          }
          return list.map((a) => ({
            ...a,
            performedBy: mockUsersMap[a.performedById] || {
              id: a.performedById,
              name: "Staff",
              email: "staff@toktick.local",
              role: "IT_Staff",
            },
          }));
        },
        findFirst: async ({ where }: any) => {
          const match = mockActions.find((a) => {
            if (where.id !== undefined && a.id !== where.id) return false;
            if (where.ticketId !== undefined && a.ticketId !== where.ticketId) return false;
            if (where.description !== undefined && a.description !== where.description) return false;
            return true;
          });
          if (!match) return null;
          return {
            ...match,
            performedBy: mockUsersMap[match.performedById] || null,
          };
        },
        create: async ({ data, include }: any) => {
          const newId = mockActions.length + 1;
          const staff = mockUsersMap[data.performedById] || {
            id: data.performedById,
            name: "Staff",
            email: "staff@toktick.local",
            role: "IT_Staff",
          };
          const created = {
            id: newId,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            performedBy: staff,
          };
          mockActions.push(created);
          return created;
        },
        update: async ({ where, data, include }: any) => {
          const index = mockActions.findIndex((a) => a.id === where.id);
          if (index === -1) throw new Error("Record to update not found.");
          const updated = {
            ...mockActions[index],
            ...data,
            updatedAt: new Date(),
          };
          if (data.performedById) {
            updated.performedBy = mockUsersMap[data.performedById];
          }
          mockActions[index] = updated;
          return updated;
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
  // Section 1: Authentication & Authorization Tests
  // ==========================================================================
  describe("Authentication & RBAC Constraints", () => {
    it("returns 401 Unauthorized when Authorization header is missing", async () => {
      const res = await request(app).get("/api/tickets/101/actions-taken");
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Authentication token required");
    });

    it("returns 401 Unauthorized for malformed Bearer token", async () => {
      const res = await request(app)
        .get("/api/tickets/101/actions-taken")
        .set("Authorization", "Bearer invalid.jwt.signature");
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Invalid or expired token");
    });

    it("returns 403 Forbidden when user is deactivated", async () => {
      const res = await request(app)
        .get("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${inactiveToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Account has been deactivated");
    });

    it("returns 403 Forbidden with PASSWORD_CHANGE_REQUIRED when mustChangePassword is true", async () => {
      const res = await request(app)
        .get("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${mustChangePwdToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("returns 403 Forbidden when a Requester attempts to POST an Action Taken (AC-05)", async () => {
      const res = await request(app)
        .post("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${requester1Token}`)
        .send({
          description: "Requester trying to record action taken",
          result: "Should not be allowed",
          followUpRequired: false,
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden: insufficient permissions");
    });

    it("returns 403 Forbidden when a Requester attempts to PATCH an Action Taken (AC-05)", async () => {
      const res = await request(app)
        .patch("/api/tickets/101/actions-taken/1")
        .set("Authorization", `Bearer ${requester1Token}`)
        .send({
          description: "Requester trying to modify action taken",
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden: insufficient permissions");
    });
  });

  // ==========================================================================
  // Section 2: GET /api/tickets/:id/actions-taken (AC-03, AC-04)
  // ==========================================================================
  describe("GET /api/tickets/:id/actions-taken (Timeline Retrieval)", () => {
    it("returns 400 Bad Request for invalid non-numeric ticket ID", async () => {
      const res = await request(app)
        .get("/api/tickets/invalid-id/actions-taken")
        .set("Authorization", `Bearer ${staffCharlieToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid ticket ID");
    });

    it("returns 404 Not Found for non-existent ticket ID", async () => {
      const res = await request(app)
        .get("/api/tickets/999/actions-taken")
        .set("Authorization", `Bearer ${staffCharlieToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("Ticket not found");
    });

    it("allows IT_Staff to view actions on any ticket in chronological order (AC-03)", async () => {
      const res = await request(app)
        .get("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${staffCharlieToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ticketId).toBe(101);
      expect(res.body.ticketNumber).toBe("TCK-20260901-0001");
      expect(res.body.totalActions).toBe(2);
      expect(res.body.actionsTaken).toHaveLength(2);
      expect(res.body.actionsTaken[0].id).toBe(1);
      expect(res.body.actionsTaken[1].id).toBe(2);
      expect(res.body.actionsTaken[0].performedBy.name).toBe("Charlie Staff");
      expect(res.body.actionsTaken[1].performedBy.name).toBe("Bob Smith");
    });

    it("allows Administrator to view actions on any ticket (AC-03)", async () => {
      const res = await request(app)
        .get("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${adminAliceToken}`);
      expect(res.status).toBe(200);
      expect(res.body.totalActions).toBe(2);
    });

    it("allows Requester to view actions on their OWN ticket (AC-04)", async () => {
      // Ticket 101 is owned by Sarah Johnson (requester1)
      const res = await request(app)
        .get("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${requester1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.totalActions).toBe(2);
      expect(res.body.actionsTaken[0].description).toContain("Investigated network gateway");
    });

    it("returns 404 Not Found with ZERO information leakage when Requester accesses another's ticket (AC-04)", async () => {
      // Ticket 102 is owned by Alice Johnson (requester2). requester1 attempts access:
      const res = await request(app)
        .get("/api/tickets/102/actions-taken")
        .set("Authorization", `Bearer ${requester1Token}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("Ticket not found");
    });
  });

  // ==========================================================================
  // Section 3: POST /api/tickets/:id/actions-taken (AC-01, AC-02)
  // ==========================================================================
  describe("POST /api/tickets/:id/actions-taken (Record Action Taken)", () => {
    it("returns 400 Bad Request if description is missing or shorter than 5 chars", async () => {
      const res = await request(app)
        .post("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${staffCharlieToken}`)
        .send({
          description: "fix",
          result: "Done successfully",
          followUpRequired: false,
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Description must be at least 5 characters");
    });

    it("returns 400 Bad Request if result is missing or shorter than 5 chars", async () => {
      const res = await request(app)
        .post("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${staffCharlieToken}`)
        .send({
          description: "Replaced hardware power supply unit",
          result: "ok",
          followUpRequired: false,
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Result must be at least 5 characters");
    });

    it("returns 400 Bad Request if followUpRequired is true but followUpNote is missing or < 5 chars (AC-02)", async () => {
      const res = await request(app)
        .post("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${staffCharlieToken}`)
        .send({
          description: "Reconfigured wireless access point channels",
          result: "Interference mitigated",
          followUpRequired: true,
          followUpNote: "tst", // too short
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Follow-up note is required when follow-up is requested");
    });

    it("successfully creates action taken with follow-up required = true and valid note (AC-01, AC-02)", async () => {
      const res = await request(app)
        .post("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${staffCharlieToken}`)
        .send({
          description: "Reconfigured wireless access point channels across floor 3",
          result: "Channel overlap mitigated; signal-to-noise ratio improved by 12dB",
          followUpRequired: true,
          followUpNote: "Verify roaming behavior during 10:00 class change tomorrow",
          attachmentNotes: "rf_channel_survey.pdf",
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.ticketId).toBe(101);
      expect(res.body.followUpRequired).toBe(true);
      expect(res.body.followUpNote).toBe("Verify roaming behavior during 10:00 class change tomorrow");
      expect(res.body.performedBy.id).toBe(8);
      expect(res.body.performedBy.name).toBe("Charlie Staff");

      // Verify activity log creation
      expect(mockLogs).toHaveLength(1);
      expect(mockLogs[0].action).toBe("ACTION_TAKEN_RECORDED");
    });

    it("successfully creates action taken with follow-up required = false (AC-01)", async () => {
      const res = await request(app)
        .post("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${staffBobToken}`)
        .send({
          description: "Cleaned print heads and ran alignment calibration test",
          result: "All test color bars printed clearly with zero banding",
          followUpRequired: false,
        });
      expect(res.status).toBe(201);
      expect(res.body.followUpRequired).toBe(false);
      expect(res.body.followUpNote).toBeNull();
      expect(res.body.performedBy.id).toBe(9);
      expect(res.body.performedBy.name).toBe("Bob Smith");
    });

    it("allows Administrator to record action with explicit performedById staff member", async () => {
      const res = await request(app)
        .post("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${adminAliceToken}`)
        .send({
          description: "Audited firewall rules and revoked stale VPN subnets",
          result: "Legacy IP pools purged from access-lists",
          followUpRequired: false,
          performedById: 9, // Bob Smith
        });
      expect(res.status).toBe(201);
      expect(res.body.performedBy.id).toBe(9);
      expect(res.body.performedBy.name).toBe("Bob Smith");
    });

    it("returns 400 Bad Request if performedById specifies an inactive or non-staff user", async () => {
      const res = await request(app)
        .post("/api/tickets/101/actions-taken")
        .set("Authorization", `Bearer ${staffCharlieToken}`)
        .send({
          description: "Configured RADIUS server certificates",
          result: "Certificates signed and installed",
          followUpRequired: false,
          performedById: 16, // Inactive staff user
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid staff member for performedById");
    });
  });

  // ==========================================================================
  // Section 4: PATCH /api/tickets/:id/actions-taken/:actionId (Update Action)
  // ==========================================================================
  describe("PATCH /api/tickets/:id/actions-taken/:actionId (Update Action Taken)", () => {
    it("returns 404 Not Found for non-existent action ID", async () => {
      const res = await request(app)
        .patch("/api/tickets/101/actions-taken/999")
        .set("Authorization", `Bearer ${staffCharlieToken}`)
        .send({
          description: "Updated action description text",
        });
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("Action taken not found");
    });

    it("returns 400 Bad Request when updating followUpRequired to true without valid note", async () => {
      // Action 1 initially has followUpRequired: false
      const res = await request(app)
        .patch("/api/tickets/101/actions-taken/1")
        .set("Authorization", `Bearer ${staffCharlieToken}`)
        .send({
          followUpRequired: true,
          followUpNote: "bad", // too short
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Follow-up note is required when follow-up is requested");
    });

    it("successfully updates description, result, and follow-up note", async () => {
      const res = await request(app)
        .patch("/api/tickets/101/actions-taken/1")
        .set("Authorization", `Bearer ${staffCharlieToken}`)
        .send({
          description: "Comprehensive MTU and MSS clamping audit across core switches",
          result: "All VLANs reconfigured and verified",
          followUpRequired: true,
          followUpNote: "Customer confirmation needed by tomorrow noon",
        });
      expect(res.status).toBe(200);
      expect(res.body.description).toContain("Comprehensive MTU and MSS clamping");
      expect(res.body.followUpRequired).toBe(true);
      expect(res.body.followUpNote).toContain("Customer confirmation needed");
    });
  });
});
