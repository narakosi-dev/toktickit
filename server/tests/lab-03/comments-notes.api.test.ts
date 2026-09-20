import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { signToken } from "../../src/auth.js";
import { setPrisma } from "../../src/prisma.js";

describe("Lab 3: Public Comments & Confidential Internal Notes APIs (comments-notes.api.test.ts)", () => {
  let requester1: any;
  let requester2: any;
  let staffUser: any;
  let adminUser: any;
  let inactiveStaffUser: any;
  let mustChangePwdUser: any;

  let requester1Token: string;
  let requester2Token: string;
  let staffToken: string;
  let adminToken: string;
  let inactiveToken: string;
  let mustChangePwdToken: string;

  let mockTickets: any[];
  let mockComments: any[];
  let mockNotes: any[];
  let mockLogs: any[];

  beforeEach(() => {
    requester1 = {
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.com",
      role: "Requester",
      isActive: true,
      mustChangePassword: false,
    };

    requester2 = {
      id: 2,
      name: "Alex Johnson",
      email: "alex.johnson@example.com",
      role: "Requester",
      isActive: true,
      mustChangePassword: false,
    };

    staffUser = {
      id: 6,
      name: "Michael Brown",
      email: "michael.brown@toktickit.com",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: false,
    };

    adminUser = {
      id: 7,
      name: "Sarah Jenkins",
      email: "sarah.jenkins@toktickit.com",
      role: "Administrator",
      isActive: true,
      mustChangePassword: false,
    };

    inactiveStaffUser = {
      id: 8,
      name: "Deactivated Staff",
      email: "deactivated.staff@toktickit.com",
      role: "IT_Staff",
      isActive: false,
      mustChangePassword: false,
    };

    mustChangePwdUser = {
      id: 9,
      name: "Fresh Staff",
      email: "fresh.staff@toktickit.com",
      role: "IT_Staff",
      isActive: true,
      mustChangePassword: true,
    };

    requester1Token = signToken(requester1);
    requester2Token = signToken(requester2);
    staffToken = signToken(staffUser);
    adminToken = signToken(adminUser);
    inactiveToken = signToken(inactiveStaffUser);
    mustChangePwdToken = signToken(mustChangePwdUser);

    mockComments = [
      {
        id: 1,
        ticketId: 101,
        userId: 1,
        content: "I have uploaded the diagnostic log file as requested.",
        createdAt: new Date("2026-09-19T02:00:00.000Z"),
        user: requester1,
      },
      {
        id: 2,
        ticketId: 101,
        userId: 6,
        content: "Thank you, we are reviewing the logs now.",
        createdAt: new Date("2026-09-19T02:05:00.000Z"),
        user: staffUser,
      },
    ];

    mockNotes = [
      {
        id: 1,
        ticketId: 101,
        userId: 6,
        content: "ISP gateway had intermittent packet loss on VLAN 20.",
        createdAt: new Date("2026-09-19T02:02:00.000Z"),
        user: staffUser,
      },
    ];

    mockLogs = [];

    mockTickets = [
      {
        id: 101,
        ticketNumber: "TKT-2026-000101",
        ticketDate: new Date("2026-09-19T01:00:00.000Z"),
        summary: "VPN connection drops frequently",
        description: "VPN drops every 10 minutes when connecting to corporate resources",
        priority: "High",
        itPriority: "High",
        status: "In_Progress",
        resolvedIndicated: false,
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 2,
        assignedToId: 6,
        createdAt: new Date("2026-09-19T01:00:00.000Z"),
        updatedAt: new Date("2026-09-19T02:05:00.000Z"),
        requester: requester1,
        assignedTo: staffUser,
        category: { id: 1, name: "Network" },
        relatedSystem: { id: 2, name: "Corporate VPN" },
        attachments: [],
        publicComments: mockComments,
        internalNotes: mockNotes,
        activityLogs: mockLogs,
        _count: { attachments: 0, publicComments: 2, internalNotes: 1 },
      },
      {
        id: 102,
        ticketNumber: "TKT-2026-000102",
        ticketDate: new Date("2026-09-19T02:00:00.000Z"),
        summary: "Laptop battery drains quickly",
        description: "Battery health low",
        priority: "Medium",
        itPriority: "Medium",
        status: "Open",
        resolvedIndicated: false,
        requesterId: 2,
        categoryId: 2,
        relatedSystemId: 1,
        assignedToId: 6,
        createdAt: new Date("2026-09-19T02:00:00.000Z"),
        updatedAt: new Date("2026-09-19T02:00:00.000Z"),
        requester: requester2,
        assignedTo: staffUser,
        category: { id: 2, name: "Hardware" },
        relatedSystem: { id: 1, name: "Workstation" },
        attachments: [],
        publicComments: [],
        internalNotes: [],
        activityLogs: [],
        _count: { attachments: 0, publicComments: 0, internalNotes: 0 },
      },
    ];

    const usersMap: Record<number, any> = {
      1: requester1,
      2: requester2,
      6: staffUser,
      7: adminUser,
      8: inactiveStaffUser,
      9: mustChangePwdUser,
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
        findUnique: async ({ where, select }: any) => {
          const t = mockTickets.find((x) => x.id === where.id);
          if (!t) return null;
          if (select) {
            const res: any = {};
            for (const key of Object.keys(select)) {
              res[key] = (t as any)[key];
            }
            return res;
          }
          return {
            ...t,
            publicComments: mockComments.filter((c) => c.ticketId === t.id),
            internalNotes: mockNotes.filter((n) => n.ticketId === t.id),
            activityLogs: mockLogs.filter((l) => l.ticketId === t.id),
          };
        },
      },
      publicComment: {
        create: async ({ data, include }: any) => {
          const user = usersMap[data.userId];
          const newComment = {
            id: mockComments.length + 1,
            ticketId: data.ticketId,
            userId: data.userId,
            content: data.content,
            createdAt: new Date(),
            user: include?.user ? { id: user.id, name: user.name, email: user.email, role: user.role } : undefined,
          };
          mockComments.push(newComment);
          return newComment;
        },
        findMany: async ({ where }: any) => {
          return mockComments
            .filter((c) => c.ticketId === where.ticketId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        },
      },
      internalNote: {
        create: async ({ data, include }: any) => {
          const user = usersMap[data.userId];
          const newNote = {
            id: mockNotes.length + 1,
            ticketId: data.ticketId,
            userId: data.userId,
            content: data.content,
            createdAt: new Date(),
            user: include?.user ? { id: user.id, name: user.name, email: user.email, role: user.role } : undefined,
          };
          mockNotes.push(newNote);
          return newNote;
        },
        findMany: async ({ where }: any) => {
          return mockNotes
            .filter((n) => n.ticketId === where.ticketId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        },
      },
      activityLog: {
        create: async ({ data }: any) => {
          const newLog = {
            id: mockLogs.length + 1,
            ticketId: data.ticketId,
            userId: data.userId,
            action: data.action,
            details: data.details,
            createdAt: new Date(),
          };
          mockLogs.push(newLog);
          return newLog;
        },
      },
    });
  });

  // ==========================================================================
  // 1. Public Comments (TC-COMM-01, TC-COMM-02, TC-COMM-03, AC-14)
  // ==========================================================================
  describe("Public Comments Endpoints (/api/tickets/:id/comments)", () => {
    it("TC-COMM-01 (AC-14): Requester posts public comment on own ticket; receives HTTP 201; comment saved", async () => {
      const res = await request(app)
        .post("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${requester1Token}`)
        .send({ content: "Here is the additional error screenshot." });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.content).toBe("Here is the additional error screenshot.");
      expect(res.body.ticketId).toBe(101);
      expect(res.body.userId).toBe(1);
      expect(res.body.author.name).toBe("Jennifer Anderson");
      expect(res.body.author.role).toBe("Requester");

      // Verify audit log
      const commentLog = mockLogs.find((l) => l.action === "PUBLIC_COMMENT_ADDED");
      expect(commentLog).toBeDefined();
      expect(commentLog.ticketId).toBe(101);
      expect(commentLog.userId).toBe(1);
    });

    it("TC-COMM-02 (AC-14): IT Staff posts public comment on ticket; receives HTTP 201", async () => {
      const res = await request(app)
        .post("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "We will dispatch a technician at 3:00 PM." });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe("We will dispatch a technician at 3:00 PM.");
      expect(res.body.userId).toBe(6);
      expect(res.body.author.name).toBe("Michael Brown");
      expect(res.body.author.role).toBe("IT_Staff");
    });

    it("Administrator posts public comment on ticket; receives HTTP 201", async () => {
      const res = await request(app)
        .post("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "Administrator note: Ticket escalated to Tier 3." });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(7);
      expect(res.body.author.role).toBe("Administrator");
    });

    it("TC-COMM-03 (AC-14): Requester fetches ticket comments via GET /api/tickets/:id/comments; receives all public comments", async () => {
      const res = await request(app)
        .get("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${requester1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].content).toContain("uploaded the diagnostic log");
      expect(res.body[0].author).toBeDefined();
      expect(res.body[1].content).toContain("reviewing the logs now");
      expect(res.body[1].author).toBeDefined();
    });

    it("IT Staff fetches public comments for any ticket via GET /api/tickets/:id/comments", async () => {
      const res = await request(app)
        .get("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it("TC-COMM-10: Requester cannot post comment on another requester's ticket (returns 404 Not Found per BR-07)", async () => {
      // Requester 2 attempting to comment on ticket 101 (owned by Requester 1)
      const res = await request(app)
        .post("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${requester2Token}`)
        .send({ content: "Unauthorized comment attempt." });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("TC-COMM-11: Requester cannot fetch comments of another requester's ticket (returns 404 Not Found per BR-07)", async () => {
      const res = await request(app)
        .get("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${requester2Token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("TC-COMM-12: Rejects empty or whitespace-only comment content with 400 Bad Request", async () => {
      const res1 = await request(app)
        .post("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${requester1Token}`)
        .send({ content: "" });

      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${requester1Token}`)
        .send({ content: "    " });

      expect(res2.status).toBe(400);

      const res3 = await request(app)
        .post("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${requester1Token}`)
        .send({});

      expect(res3.status).toBe(400);
    });

    it("Rejects comment content exceeding 1000 characters with 400 Bad Request", async () => {
      const longContent = "A".repeat(1001);
      const res = await request(app)
        .post("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${requester1Token}`)
        .send({ content: longContent });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("1000");
    });

    it("Rejects comment on non-existent ticket with 404 Not Found", async () => {
      const res = await request(app)
        .post("/api/tickets/99999/comments")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Comment on missing ticket." });

      expect(res.status).toBe(404);
    });

    it("Rejects unauthenticated call with 401 Unauthorized", async () => {
      const res1 = await request(app)
        .post("/api/tickets/101/comments")
        .send({ content: "No token." });

      expect(res1.status).toBe(401);

      const res2 = await request(app).get("/api/tickets/101/comments");
      expect(res2.status).toBe(401);
    });

    it("Rejects user with mustChangePassword=true with 403 PASSWORD_CHANGE_REQUIRED", async () => {
      const res = await request(app)
        .post("/api/tickets/101/comments")
        .set("Authorization", `Bearer ${mustChangePwdToken}`)
        .send({ content: "Needs password change." });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });
  });

  // ==========================================================================
  // 2. Confidential Internal Notes (TC-COMM-04, TC-COMM-05, TC-COMM-06, TC-COMM-07, AC-15, BR-10)
  // ==========================================================================
  describe("Confidential Internal Notes Endpoints (/api/staff/tickets/:id/internal-notes & /api/tickets/:id/notes)", () => {
    it("TC-COMM-04 (AC-15, BR-10): IT Staff posts internal note via POST /api/staff/tickets/:id/internal-notes; receives HTTP 201", async () => {
      const res = await request(app)
        .post("/api/staff/tickets/101/internal-notes")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Contacted upstream ISP tier-2 support for gateway diagnostics." });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.content).toBe("Contacted upstream ISP tier-2 support for gateway diagnostics.");
      expect(res.body.ticketId).toBe(101);
      expect(res.body.userId).toBe(6);
      expect(res.body.author.name).toBe("Michael Brown");
      expect(res.body.author.role).toBe("IT_Staff");

      // Verify audit log
      const noteLog = mockLogs.find((l) => l.action === "INTERNAL_NOTE_ADDED");
      expect(noteLog).toBeDefined();
      expect(noteLog.ticketId).toBe(101);
      expect(noteLog.userId).toBe(6);
    });

    it("TC-COMM-05 (AC-15, BR-10): IT Staff fetches internal notes via GET /api/staff/tickets/:id/internal-notes; receives notes list", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/101/internal-notes")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].content).toContain("ISP gateway had intermittent packet loss");
      expect(res.body[0].author.role).toBe("IT_Staff");
    });

    it("Administrator can post and fetch internal notes on /api/staff/tickets/:id/internal-notes", async () => {
      const postRes = await request(app)
        .post("/api/staff/tickets/101/internal-notes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "Admin approval granted for core switch replacement." });

      expect(postRes.status).toBe(201);
      expect(postRes.body.author.role).toBe("Administrator");

      const getRes = await request(app)
        .get("/api/staff/tickets/101/internal-notes")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.length).toBe(2);
    });

    it("TC-COMM-06 (AC-15, BR-10): Requester calls GET /api/staff/tickets/:id/internal-notes; receives HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/101/internal-notes")
        .set("Authorization", `Bearer ${requester1Token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
    });

    it("TC-COMM-07 (AC-15, BR-10): Requester calls POST /api/staff/tickets/:id/internal-notes; receives HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/staff/tickets/101/internal-notes")
        .set("Authorization", `Bearer ${requester1Token}`)
        .send({ content: "Malicious internal note injection attempt." });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
    });

    it("Alternate path /api/tickets/:id/notes: IT Staff succeeds, Requester receives 403 Forbidden", async () => {
      // IT Staff succeeds
      const staffRes = await request(app)
        .get("/api/tickets/101/notes")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(staffRes.status).toBe(200);
      expect(Array.isArray(staffRes.body)).toBe(true);

      // Requester blocked with 403
      const reqRes = await request(app)
        .get("/api/tickets/101/notes")
        .set("Authorization", `Bearer ${requester1Token}`);

      expect(reqRes.status).toBe(403);

      const postRes = await request(app)
        .post("/api/tickets/101/notes")
        .set("Authorization", `Bearer ${requester1Token}`)
        .send({ content: "Forbidden post" });

      expect(postRes.status).toBe(403);
    });

    it("TC-COMM-13: Rejects empty or > 1000 character note content with 400 Bad Request", async () => {
      const emptyRes = await request(app)
        .post("/api/staff/tickets/101/internal-notes")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "   " });

      expect(emptyRes.status).toBe(400);

      const longRes = await request(app)
        .post("/api/staff/tickets/101/internal-notes")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Z".repeat(1001) });

      expect(longRes.status).toBe(400);
    });

    it("Rejects internal note for non-existent ticket with 404 Not Found", async () => {
      const res = await request(app)
        .post("/api/staff/tickets/99999/internal-notes")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Note on missing ticket." });

      expect(res.status).toBe(404);
    });

    it("Rejects unauthenticated access to internal notes with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/staff/tickets/101/internal-notes");
      expect(res.status).toBe(401);
    });

    it("Rejects inactive user token with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/101/internal-notes")
        .set("Authorization", `Bearer ${inactiveToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // 3. Zero Data Leakage (TC-COMM-08, BR-10)
  // ==========================================================================
  describe("Zero Data Leakage & Requester Payload Sanitization (TC-COMM-08, BR-10)", () => {
    it("TC-COMM-08 (BR-10): Requester calling GET /api/tickets/:id receives ticket payload with zero internal notes fields or counts", async () => {
      const res = await request(app)
        .get("/api/tickets/101")
        .set("Authorization", `Bearer ${requester1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(101);
      expect(res.body.summary).toBe("VPN connection drops frequently");

      // Critical Security Check: zero internal notes data or count exposed to Requester
      expect(res.body).not.toHaveProperty("internalNotes");
      if (res.body._count) {
        expect(res.body._count).not.toHaveProperty("internalNotes");
      }
    });

    it("Staff ticket detail GET /api/staff/tickets/:id includes internalNotes with author metadata", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/101")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("internalNotes");
      expect(Array.isArray(res.body.internalNotes)).toBe(true);
      expect(res.body.internalNotes.length).toBe(1);
      expect(res.body.internalNotes[0].author).toBeDefined();
      expect(res.body.internalNotes[0].author.role).toBe("IT_Staff");
    });
  });

  // ==========================================================================
  // 4. Append-Only Invariant Enforcement (TC-COMM-09, BR-09, BR-10)
  // ==========================================================================
  describe("Append-Only Invariant Enforcement (TC-COMM-09, BR-09, BR-10)", () => {
    it("TC-COMM-09 (BR-09): Calling PUT /api/tickets/:id/comments/:commentId returns HTTP 405 Method Not Allowed", async () => {
      const res = await request(app)
        .put("/api/tickets/101/comments/1")
        .set("Authorization", `Bearer ${requester1Token}`)
        .send({ content: "Modified comment text." });

      expect(res.status).toBe(405);
      expect(res.body.error).toContain("append-only");
    });

    it("Calling PATCH /api/tickets/:id/comments/:commentId returns HTTP 405 Method Not Allowed", async () => {
      const res = await request(app)
        .patch("/api/tickets/101/comments/1")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Modified comment text." });

      expect(res.status).toBe(405);
      expect(res.body.error).toContain("append-only");
    });

    it("Calling DELETE /api/tickets/:id/comments/:commentId returns HTTP 405 Method Not Allowed", async () => {
      const res = await request(app)
        .delete("/api/tickets/101/comments/1")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(405);
      expect(res.body.error).toContain("append-only");
    });

    it("Calling PUT, PATCH, or DELETE on internal notes returns HTTP 405 Method Not Allowed", async () => {
      const putRes = await request(app)
        .put("/api/staff/tickets/101/internal-notes/1")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Tampered note." });

      expect(putRes.status).toBe(405);

      const delRes = await request(app)
        .delete("/api/staff/tickets/101/internal-notes/1")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(delRes.status).toBe(405);
    });
  });
});
