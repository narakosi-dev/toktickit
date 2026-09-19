import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { signToken } from "../../src/auth.js";
import { setPrisma } from "../../src/prisma.js";

describe("Lab 3: IT Staff Ticket Operations & Status Transition Matrix (staff-ticket-detail.api.test.ts)", () => {
  let requesterUser: any;
  let staffUser: any;
  let adminUser: any;
  let inactiveStaffUser: any;
  let anotherStaffUser: any;

  let requesterToken: string;
  let staffToken: string;
  let adminToken: string;

  let mockTickets: any[];
  let mockLogs: any[];

  beforeEach(() => {
    requesterUser = {
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.com",
      role: "Requester",
      isActive: true,
      mustChangePassword: false,
    };

    staffUser = {
      id: 2,
      name: "Michael Brown",
      email: "michael.brown@toktickit.com",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: false,
    };

    adminUser = {
      id: 3,
      name: "Sarah Jenkins",
      email: "sarah.jenkins@toktickit.com",
      role: "Administrator",
      isActive: true,
      mustChangePassword: false,
    };

    inactiveStaffUser = {
      id: 4,
      name: "Former Staff",
      email: "former.staff@toktickit.com",
      role: "IT_Staff",
      isActive: false,
      mustChangePassword: false,
    };

    anotherStaffUser = {
      id: 5,
      name: "David Wilson",
      email: "david.wilson@toktickit.com",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: false,
    };

    requesterToken = signToken(requesterUser);
    staffToken = signToken(staffUser);
    adminToken = signToken(adminUser);

    mockLogs = [];

    mockTickets = [
      {
        id: 101,
        ticketNumber: "TKT-2026-000101",
        ticketDate: new Date("2026-09-19T01:00:00.000Z"),
        summary: "VPN connection drops frequently",
        description: "Staff cannot connect to corporate VPN network printer",
        priority: "High",
        itPriority: null,
        status: "New",
        resolvedIndicated: false,
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 2,
        assignedToId: null,
        createdAt: new Date("2026-09-19T01:00:00.000Z"),
        updatedAt: new Date("2026-09-19T01:00:00.000Z"),
        requester: requesterUser,
        assignedTo: null,
        category: { id: 1, name: "Network" },
        relatedSystem: { id: 2, name: "Corporate VPN" },
        attachments: [],
        publicComments: [],
        internalNotes: [],
        activityLogs: [],
        _count: { attachments: 0, publicComments: 0, internalNotes: 0 },
      },
      {
        id: 102,
        ticketNumber: "TKT-2026-000102",
        ticketDate: new Date("2026-09-19T02:00:00.000Z"),
        summary: "Laptop battery drains in 30 minutes",
        description: "Dell Latitude 7420 battery health degraded to 40%",
        priority: "Medium",
        itPriority: "Medium",
        status: "Assigned",
        resolvedIndicated: false,
        requesterId: 1,
        categoryId: 2,
        relatedSystemId: 1,
        assignedToId: 2,
        createdAt: new Date("2026-09-19T02:00:00.000Z"),
        updatedAt: new Date("2026-09-19T02:00:00.000Z"),
        requester: requesterUser,
        assignedTo: staffUser,
        category: { id: 2, name: "Hardware" },
        relatedSystem: { id: 1, name: "Workstation" },
        attachments: [],
        publicComments: [],
        internalNotes: [],
        activityLogs: [],
        _count: { attachments: 0, publicComments: 0, internalNotes: 0 },
      },
      {
        id: 103,
        ticketNumber: "TKT-2026-000103",
        ticketDate: new Date("2026-09-19T03:00:00.000Z"),
        summary: "Office printer jam and toner low",
        description: "Floor 3 printer paper feed issue",
        priority: "Medium",
        itPriority: "High",
        status: "In_Progress",
        resolvedIndicated: false,
        requesterId: 1,
        categoryId: 2,
        relatedSystemId: 3,
        assignedToId: 2,
        createdAt: new Date("2026-09-19T03:00:00.000Z"),
        updatedAt: new Date("2026-09-19T03:00:00.000Z"),
        requester: requesterUser,
        assignedTo: staffUser,
        category: { id: 2, name: "Hardware" },
        relatedSystem: { id: 3, name: "Office Printer" },
        attachments: [],
        publicComments: [],
        internalNotes: [],
        activityLogs: [],
        _count: { attachments: 0, publicComments: 0, internalNotes: 0 },
      },
      {
        id: 104,
        ticketNumber: "TKT-2026-000104",
        ticketDate: new Date("2026-09-19T04:00:00.000Z"),
        summary: "Email sync error on Outlook",
        description: "Cannot receive external email messages",
        priority: "High",
        itPriority: "High",
        status: "Pending_Requester",
        resolvedIndicated: false,
        requesterId: 1,
        categoryId: 3,
        relatedSystemId: 4,
        assignedToId: 2,
        createdAt: new Date("2026-09-19T04:00:00.000Z"),
        updatedAt: new Date("2026-09-19T04:00:00.000Z"),
        requester: requesterUser,
        assignedTo: staffUser,
        category: { id: 3, name: "Email" },
        relatedSystem: { id: 4, name: "Exchange" },
        attachments: [],
        publicComments: [],
        internalNotes: [],
        activityLogs: [],
        _count: { attachments: 0, publicComments: 0, internalNotes: 0 },
      },
      {
        id: 105,
        ticketNumber: "TKT-2026-000105",
        ticketDate: new Date("2026-09-19T05:00:00.000Z"),
        summary: "Monitor display flickering",
        description: "HDMI cable loose or faulty display port",
        priority: "Low",
        itPriority: "Low",
        status: "Resolved",
        resolvedIndicated: true,
        requesterId: 1,
        categoryId: 2,
        relatedSystemId: 1,
        assignedToId: 3,
        createdAt: new Date("2026-09-19T05:00:00.000Z"),
        updatedAt: new Date("2026-09-19T05:00:00.000Z"),
        requester: requesterUser,
        assignedTo: adminUser,
        category: { id: 2, name: "Hardware" },
        relatedSystem: { id: 1, name: "Workstation" },
        attachments: [],
        publicComments: [],
        internalNotes: [],
        activityLogs: [],
        _count: { attachments: 0, publicComments: 0, internalNotes: 0 },
      },
      {
        id: 106,
        ticketNumber: "TKT-2026-000106",
        ticketDate: new Date("2026-09-19T06:00:00.000Z"),
        summary: "Security badge reader offline",
        description: "Door 4 badge scanner unresponsive",
        priority: "Critical",
        itPriority: "Critical",
        status: "Closed",
        resolvedIndicated: true,
        requesterId: 1,
        categoryId: 4,
        relatedSystemId: 5,
        assignedToId: 2,
        createdAt: new Date("2026-09-19T06:00:00.000Z"),
        updatedAt: new Date("2026-09-19T06:00:00.000Z"),
        requester: requesterUser,
        assignedTo: staffUser,
        category: { id: 4, name: "Security" },
        relatedSystem: { id: 5, name: "Access Control" },
        attachments: [],
        publicComments: [],
        internalNotes: [],
        activityLogs: [],
        _count: { attachments: 0, publicComments: 0, internalNotes: 0 },
      },
    ];

    const usersMap: Record<number, any> = {
      1: requesterUser,
      2: staffUser,
      3: adminUser,
      4: inactiveStaffUser,
      5: anotherStaffUser,
    };

    setPrisma({
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id) return usersMap[where.id] || null;
          if (where.email) {
            return Object.values(usersMap).find((u) => u.email === where.email) || null;
          }
          return null;
        },
        findMany: async ({ where }: any) => {
          let list = Object.values(usersMap);
          if (where?.role?.in) {
            list = list.filter((u) => where.role.in.includes(u.role));
          }
          if (where?.isActive !== undefined) {
            list = list.filter((u) => u.isActive === where.isActive);
          }
          return list;
        },
      },
      ticket: {
        findUnique: async ({ where }: any) => {
          const t = mockTickets.find((x) => x.id === where.id);
          if (!t) return null;
          return {
            ...t,
            activityLogs: mockLogs.filter((l) => l.ticketId === t.id),
          };
        },
        update: async ({ where, data }: any) => {
          const t = mockTickets.find((x) => x.id === where.id);
          if (!t) throw new Error("Ticket not found");
          Object.assign(t, data);
          if (data.assignedToId !== undefined) {
            t.assignedTo = data.assignedToId ? usersMap[data.assignedToId] || null : null;
          }
          return {
            ...t,
            activityLogs: mockLogs.filter((l) => l.ticketId === t.id),
          };
        },
      },
      activityLog: {
        create: async ({ data }: any) => {
          const log = { id: mockLogs.length + 1, createdAt: new Date(), ...data };
          mockLogs.push(log);
          return log;
        },
        findMany: async ({ where }: any) => {
          return mockLogs.filter((l) => l.ticketId === where.ticketId);
        },
      },
    });
  });

  describe("Staff Members List (GET /api/staff/members)", () => {
    it("returns list of active IT Staff and Administrators", async () => {
      const res = await request(app)
        .get("/api/staff/members")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const roles = res.body.map((m: any) => m.role);
      expect(roles).toContain("IT_Staff");
      expect(roles).toContain("Administrator");
      expect(roles).not.toContain("Requester");
      // Does not contain inactive staff (id: 4)
      const ids = res.body.map((m: any) => m.id);
      expect(ids).not.toContain(4);
    });

    it("returns 403 Forbidden for Requester token", async () => {
      const res = await request(app)
        .get("/api/staff/members")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Staff Ticket Detail (GET /api/staff/tickets/:id)", () => {
    it("returns full ticket details for valid ID", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/101")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(101);
      expect(res.body.ticketNumber).toBe("TKT-2026-000101");
      expect(res.body).toHaveProperty("category");
      expect(res.body).toHaveProperty("relatedSystem");
      expect(res.body).toHaveProperty("requester");
      expect(res.body).toHaveProperty("_count");
    });

    it("returns 404 for non-existent ticket ID", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/99999")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Ticket not found");
    });
  });

  describe("Ticket Assignment & Claiming (POST/PATCH /api/staff/tickets/:id/assign)", () => {
    it("TC-OP-01 (AC-09): assigns ticket to self when claiming and creates activity entry", async () => {
      const res = await request(app)
        .post("/api/staff/tickets/101/assign")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ staffId: staffUser.id });

      expect(res.status).toBe(200);
      expect(res.body.assignedToId).toBe(staffUser.id);
      expect(res.body.assignedTo.name).toBe("Michael Brown");

      // Verify activity entry created
      expect(mockLogs.length).toBeGreaterThan(0);
      const assignLog = mockLogs.find((l) => l.action === "TICKET_ASSIGNED");
      expect(assignLog).toBeDefined();
      expect(assignLog.userId).toBe(staffUser.id);
    });

    it("TC-OP-02 (AC-10): reassigns ticket to another active IT Staff member", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/102/assign")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ staffId: anotherStaffUser.id });

      expect(res.status).toBe(200);
      expect(res.body.assignedToId).toBe(anotherStaffUser.id);
      expect(res.body.assignedTo.name).toBe("David Wilson");

      const assignLog = mockLogs.find((l) => l.action === "TICKET_ASSIGNED");
      expect(assignLog).toBeDefined();
      expect(assignLog.details).toContain("David Wilson");
    });

    it("TC-OP-03 (BR-06): rejects assignment to a Requester user ID with HTTP 400", async () => {
      const res = await request(app)
        .post("/api/staff/tickets/101/assign")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ staffId: requesterUser.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Assignee must be an active IT Staff or Administrator");
    });

    it("TC-OP-04 (BR-06): rejects assignment to an inactive staff user ID with HTTP 400", async () => {
      const res = await request(app)
        .post("/api/staff/tickets/101/assign")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ staffId: inactiveStaffUser.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Assignee must be an active IT Staff or Administrator");
    });

    it("allows unassigning a ticket by passing staffId: null", async () => {
      const res = await request(app)
        .post("/api/staff/tickets/102/assign")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ staffId: null });

      expect(res.status).toBe(200);
      expect(res.body.assignedToId).toBeNull();
      expect(mockLogs.some((l) => l.action === "TICKET_UNASSIGNED")).toBe(true);
    });
  });

  describe("IT Priority Override (PATCH /api/staff/tickets/:id/priority)", () => {
    it("TC-OP-05 (AC-11, BR-07): updates itPriority while keeping requester impact priority unchanged", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/101/priority")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "Critical" });

      expect(res.status).toBe(200);
      expect(res.body.itPriority).toBe("Critical");
      expect(res.body.priority).toBe("High"); // original requester impact priority preserved

      const log = mockLogs.find((l) => l.action === "PRIORITY_UPDATED");
      expect(log).toBeDefined();
      expect(log.details).toContain("Critical");
    });

    it("rejects invalid priority value with HTTP 400", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/101/priority")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "UltraHigh" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("itPriority must be one of: Low, Medium, High, Critical");
    });
  });

  describe("Status Transition Matrix Enforcement (BR-08 / BR-13)", () => {
    it("TC-OP-06 (AC-12, BR-08): valid transition New ➔ Assigned succeeds with HTTP 200", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Assigned" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Assigned");
      expect(mockLogs.some((l) => l.action === "STATUS_TRANSITION")).toBe(true);
    });

    it("TC-OP-07 (AC-12, BR-08): valid transition Assigned ➔ In_Progress succeeds with HTTP 200", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/102/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "In_Progress" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("In_Progress");
    });

    it("TC-OP-08 (AC-12, BR-08): valid transition In_Progress ➔ Pending_Requester succeeds with HTTP 200", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/103/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Pending_Requester" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Pending_Requester");
    });

    it("TC-OP-09 (AC-12, BR-08): valid transition In_Progress ➔ Resolved succeeds with HTTP 200", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/103/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Resolved" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Resolved");
    });

    it("TC-OP-10 (AC-12, BR-08): valid transition Resolved ➔ Closed succeeds with HTTP 200", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/105/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Closed" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Closed");
    });

    it("TC-OP-11 (AC-12, BR-08): valid transition Resolved ➔ In_Progress (Reopen) succeeds with HTTP 200", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/105/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "In_Progress" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("In_Progress");
    });

    it("TC-OP-12 (AC-13, BR-08): invalid transition New ➔ Resolved returns HTTP 400", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Resolved" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid status transition from 'New' to 'Resolved'");
    });

    it("TC-OP-13 (AC-13, BR-08): invalid transition Closed ➔ In_Progress returns HTTP 400 (terminal state)", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/106/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "In_Progress" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid status transition from 'Closed' to 'In_Progress'");
    });

    it("TC-OP-14 (AC-13, BR-08): invalid transition Closed ➔ Resolved returns HTTP 400", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/106/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Resolved" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid status transition from 'Closed' to 'Resolved'");
    });

    it("TC-OP-15 (AC-13, BR-08): invalid transition New ➔ Closed returns HTTP 400", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Closed" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid status transition from 'New' to 'Closed'");
    });

    it("rejects transition to the identical status with HTTP 400", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/101/status")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "New" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid status transition");
    });
  });

  describe("Requester Problem Resolution Indication (POST /api/tickets/:id/resolve-indication)", () => {
    it("TC-OP-16 (BR-11): Requester calling POST /api/tickets/:id/resolve-indication sets resolvedIndicated: true", async () => {
      const res = await request(app)
        .post("/api/tickets/103/resolve-indication")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.resolvedIndicated).toBe(true);

      const log = mockLogs.find((l) => l.action === "RESOLVE_INDICATED");
      expect(log).toBeDefined();
      expect(log.userId).toBe(requesterUser.id);
    });

    it("rejects resolution indication on a closed ticket with HTTP 400", async () => {
      const res = await request(app)
        .post("/api/tickets/106/resolve-indication")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Cannot indicate resolution on a closed or cancelled ticket");
    });
  });
});
