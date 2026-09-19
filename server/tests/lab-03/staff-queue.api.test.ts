import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { signToken } from "../../src/auth.js";
import { setPrisma } from "../../src/prisma.js";

describe("Lab 3: IT Staff Shared Queue API (staff-queue.api.test.ts)", () => {
  let requesterUser: any;
  let staffUser: any;
  let adminUser: any;
  let mustChangePasswordUser: any;
  let mockTickets: any[];

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

    mustChangePasswordUser = {
      id: 4,
      name: "New Staff",
      email: "new.staff@toktickit.com",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: true,
    };

    mockTickets = [
      {
        id: 101,
        ticketNumber: "TKT-2026-000101",
        ticketDate: new Date("2026-09-19T01:00:00.000Z"),
        summary: "VPN connection drops frequently",
        description: "Staff cannot connect to corporate VPN network printer",
        priority: "High",
        itPriority: "Critical",
        status: "Open",
        resolvedIndicated: false,
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 2,
        assignedToId: 2,
        createdAt: new Date("2026-09-19T01:00:00.000Z"),
        updatedAt: new Date("2026-09-19T01:00:00.000Z"),
        requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "Requester" },
        assignedTo: { id: 2, name: "Michael Brown", email: "michael.brown@toktickit.com", role: "IT_Staff" },
        category: { id: 1, name: "Network" },
        relatedSystem: { id: 2, name: "Corporate VPN" },
        _count: { attachments: 1, publicComments: 2, internalNotes: 1 },
      },
      {
        id: 102,
        ticketNumber: "TKT-2026-000102",
        ticketDate: new Date("2026-09-19T02:00:00.000Z"),
        summary: "Need replacement mouse",
        description: "Hardware optical mouse stopped working",
        priority: "Low",
        itPriority: null,
        status: "New",
        resolvedIndicated: false,
        requesterId: 1,
        categoryId: 2,
        relatedSystemId: 1,
        assignedToId: null,
        createdAt: new Date("2026-09-19T02:00:00.000Z"),
        updatedAt: new Date("2026-09-19T02:00:00.000Z"),
        requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "Requester" },
        assignedTo: null,
        category: { id: 2, name: "Hardware" },
        relatedSystem: { id: 1, name: "Workstation" },
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
        requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "Requester" },
        assignedTo: { id: 2, name: "Michael Brown", email: "michael.brown@toktickit.com", role: "IT_Staff" },
        category: { id: 2, name: "Hardware" },
        relatedSystem: { id: 3, name: "Office Printer" },
        _count: { attachments: 2, publicComments: 1, internalNotes: 3 },
      },
      {
        id: 104,
        ticketNumber: "TKT-2026-000104",
        ticketDate: new Date("2026-09-19T04:00:00.000Z"),
        summary: "Email sync error on Outlook",
        description: "Cannot receive external email messages",
        priority: "High",
        itPriority: null,
        status: "New",
        resolvedIndicated: false,
        requesterId: 1,
        categoryId: 3,
        relatedSystemId: 4,
        assignedToId: null,
        createdAt: new Date("2026-09-19T04:00:00.000Z"),
        updatedAt: new Date("2026-09-19T04:00:00.000Z"),
        requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "Requester" },
        assignedTo: null,
        category: { id: 3, name: "Email" },
        relatedSystem: { id: 4, name: "Exchange" },
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
        requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "Requester" },
        assignedTo: { id: 3, name: "Sarah Jenkins", email: "sarah.jenkins@toktickit.com", role: "Administrator" },
        category: { id: 2, name: "Hardware" },
        relatedSystem: { id: 1, name: "Workstation" },
        _count: { attachments: 0, publicComments: 2, internalNotes: 1 },
      },
    ];

    const usersMap: Record<number, any> = {
      1: requesterUser,
      2: staffUser,
      3: adminUser,
      4: mustChangePasswordUser,
    };

    const filterMockTickets = (where: any) => {
      return mockTickets.filter((ticket) => {
        if (!where) return true;

        if (where.status) {
          const expected = (where.status.equals || where.status).toLowerCase();
          if (ticket.status.toLowerCase() !== expected) return false;
        }

        if (where.categoryId && ticket.categoryId !== where.categoryId) {
          return false;
        }

        if (where.relatedSystemId && ticket.relatedSystemId !== where.relatedSystemId) {
          return false;
        }

        if (where.assignedToId !== undefined) {
          if (where.assignedToId === null) {
            if (ticket.assignedToId !== null) return false;
          } else if (ticket.assignedToId !== where.assignedToId) {
            return false;
          }
        }

        if (where.itPriority) {
          const expected = (where.itPriority.equals || where.itPriority).toLowerCase();
          if ((ticket.itPriority || "").toLowerCase() !== expected) return false;
        }

        if (where.OR) {
          const orMatches = where.OR.some((clause: any) => {
            if (clause.ticketNumber?.contains) {
              const term = clause.ticketNumber.contains.toLowerCase();
              return ticket.ticketNumber.toLowerCase().includes(term);
            }
            if (clause.summary?.contains) {
              const term = clause.summary.contains.toLowerCase();
              return ticket.summary.toLowerCase().includes(term);
            }
            if (clause.description?.contains) {
              const term = clause.description.contains.toLowerCase();
              return ticket.description.toLowerCase().includes(term);
            }
            if (clause.itPriority?.equals) {
              return (ticket.itPriority || "").toLowerCase() === clause.itPriority.equals.toLowerCase();
            }
            if (clause.priority?.equals && clause.itPriority === null) {
              return ticket.itPriority === null && ticket.priority.toLowerCase() === clause.priority.equals.toLowerCase();
            }
            return false;
          });
          if (!orMatches) return false;
        }

        if (where.AND) {
          for (const andClause of where.AND) {
            if (andClause.OR) {
              const orMatches = andClause.OR.some((clause: any) => {
                if (clause.ticketNumber?.contains) {
                  const term = clause.ticketNumber.contains.toLowerCase();
                  return ticket.ticketNumber.toLowerCase().includes(term);
                }
                if (clause.summary?.contains) {
                  const term = clause.summary.contains.toLowerCase();
                  return ticket.summary.toLowerCase().includes(term);
                }
                if (clause.description?.contains) {
                  const term = clause.description.contains.toLowerCase();
                  return ticket.description.toLowerCase().includes(term);
                }
                if (clause.itPriority?.equals) {
                  return (ticket.itPriority || "").toLowerCase() === clause.itPriority.equals.toLowerCase();
                }
                if (clause.priority?.equals && clause.itPriority === null) {
                  return ticket.itPriority === null && ticket.priority.toLowerCase() === clause.priority.equals.toLowerCase();
                }
                return false;
              });
              if (!orMatches) return false;
            }
          }
        }

        return true;
      });
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
      },
      ticket: {
        count: async ({ where }: any) => {
          const filtered = filterMockTickets(where);
          return filtered.length;
        },
        findMany: async ({ where, skip = 0, take = 10, orderBy }: any) => {
          let filtered = filterMockTickets(where);

          if (orderBy) {
            const key = Object.keys(orderBy)[0];
            const direction = orderBy[key] === "asc" ? 1 : -1;
            filtered.sort((a, b) => {
              if (a[key] < b[key]) return -1 * direction;
              if (a[key] > b[key]) return 1 * direction;
              return 0;
            });
          }

          return filtered.slice(skip, skip + take);
        },
      },
    });
  });

  describe("Access Control & RBAC Guards", () => {
    it("TC-AUTH-01: returns 401 Unauthorized when no Authorization header is sent", async () => {
      const res = await request(app).get("/api/staff/tickets");
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Authentication token required");
    });

    it("TC-RBAC-02: Requester calling GET /api/staff/tickets receives HTTP 403 Forbidden", async () => {
      const token = signToken(requesterUser);
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden: insufficient permissions");
    });

    it("TC-AUTH-06 (BR-02): user with mustChangePassword=true is blocked with 403 and PASSWORD_CHANGE_REQUIRED", async () => {
      const token = signToken(mustChangePasswordUser);
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("TC-RBAC-04 (BR-05): IT Staff calling GET /api/staff/tickets receives HTTP 200 with tickets list", async () => {
      const token = signToken(staffUser);
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("TC-RBAC-07: Administrator calling GET /api/staff/tickets receives HTTP 200", async () => {
      const token = signToken(adminUser);
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);
    });
  });

  describe("Shared Queue Filtering, Search, Sorting, and Pagination", () => {
    let staffToken: string;

    beforeEach(() => {
      staffToken = signToken(staffUser);
    });

    it("TC-QUEUE-01 (AC-06): returns paginated list with total count and nested requester/assignee relations", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(5);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.totalPages).toBe(1);

      const firstTicket = res.body.tickets[0];
      expect(firstTicket).toHaveProperty("ticketNumber");
      expect(firstTicket).toHaveProperty("requester");
      expect(firstTicket.requester).toHaveProperty("name");
      expect(firstTicket).toHaveProperty("category");
      expect(firstTicket).toHaveProperty("relatedSystem");
      expect(firstTicket).toHaveProperty("_count");
      expect(firstTicket).toHaveProperty("owner");
      expect(firstTicket).toHaveProperty("assignee");
    });

    it("TC-QUEUE-02 (AC-07): filter by status=New returns only tickets with status New", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=New")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(2);
      res.body.tickets.forEach((t: any) => {
        expect(t.status).toBe("New");
      });
    });

    it("TC-QUEUE-03 (AC-07): filter by priority=High returns tickets matching itPriority=High or fallback priority=High", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?priority=High")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      // Ticket 103 has itPriority=High; Ticket 104 has priority=High and itPriority=null
      expect(res.body.tickets.length).toBe(2);
      const ticketNumbers = res.body.tickets.map((t: any) => t.ticketNumber);
      expect(ticketNumbers).toContain("TKT-2026-000103");
      expect(ticketNumbers).toContain("TKT-2026-000104");
    });

    it("TC-QUEUE-04 (AC-07): filter by assigneeId=unassigned returns tickets where assignedToId is null", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?assigneeId=unassigned")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(2);
      res.body.tickets.forEach((t: any) => {
        expect(t.assignedToId).toBeNull();
      });
    });

    it("TC-QUEUE-05 (AC-07): filter by assigneeId=:staffId returns only tickets assigned to that staff member", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?assigneeId=2")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(2);
      res.body.tickets.forEach((t: any) => {
        expect(t.assignedToId).toBe(2);
      });
    });

    it("TC-QUEUE-05-MINE: filter by ownerId=mine returns tickets assigned to current user", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?ownerId=mine")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(2);
      res.body.tickets.forEach((t: any) => {
        expect(t.assignedToId).toBe(staffUser.id);
      });
    });

    it("TC-QUEUE-06 (AC-07): search query q=printer performs case-insensitive search across summary and description", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?q=printer")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      // Ticket 101 has 'printer' in description; Ticket 103 has 'printer' in summary and description
      expect(res.body.tickets.length).toBe(2);
      const ticketNumbers = res.body.tickets.map((t: any) => t.ticketNumber);
      expect(ticketNumbers).toContain("TKT-2026-000101");
      expect(ticketNumbers).toContain("TKT-2026-000103");
    });

    it("TC-QUEUE-07 (AC-08): sort by createdAt asc and desc returns properly ordered items", async () => {
      const ascRes = await request(app)
        .get("/api/staff/tickets?sortBy=createdAt&sortOrder=asc")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(ascRes.status).toBe(200);
      expect(ascRes.body.tickets[0].id).toBe(101);
      expect(ascRes.body.tickets[ascRes.body.tickets.length - 1].id).toBe(105);

      const descRes = await request(app)
        .get("/api/staff/tickets?sortBy=createdAt&sortOrder=desc")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(descRes.status).toBe(200);
      expect(descRes.body.tickets[0].id).toBe(105);
      expect(descRes.body.tickets[descRes.body.tickets.length - 1].id).toBe(101);
    });

    it("TC-QUEUE-08 (AC-08): pagination page=2&limit=2 correctly offsets records and calculates totalPages", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?page=2&limit=2")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(2);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });
  });
});
