import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma, setPrisma } from "../../src/prisma.js";
import { signToken } from "../../src/auth.js";

describe("PostgreSQL Real Requester Dashboard DB Integration Test (requester-dashboard.db.test.ts)", () => {
  let isDbAvailable = false;
  let userAToken: string;
  let userBToken: string;
  let userAId: number;
  let userBId: number;
  let createdTicketIds: number[] = [];
  const prisma = getPrisma();

  beforeAll(async () => {
    setPrisma(null);
    const realPrisma = getPrisma();

    try {
      // 1. Verify live database connection
      await realPrisma.$connect();
      await realPrisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;

      // 2. Create distinct test requesters
      const userA = await realPrisma.user.create({
        data: {
          email: `req-live-a-${Date.now()}@toktick.local`,
          name: "Live Requester A",
          passwordHash: "mockHash",
          role: "Requester",
          isActive: true,
          mustChangePassword: false,
        },
      });
      userAId = userA.id;
      userAToken = signToken(userA);

      const userB = await realPrisma.user.create({
        data: {
          email: `req-live-b-${Date.now()}@toktick.local`,
          name: "Live Requester B",
          passwordHash: "mockHash",
          role: "Requester",
          isActive: true,
          mustChangePassword: false,
        },
      });
      userBId = userB.id;
      userBToken = signToken(userB);

      // 3. Resolve or create category & system
      let category = await realPrisma.category.findFirst();
      if (!category) {
        category = await realPrisma.category.create({ data: { name: `Live-Req-Cat-${Date.now()}` } });
      }

      let system = await realPrisma.relatedSystem.findFirst();
      if (!system) {
        system = await realPrisma.relatedSystem.create({ data: { name: `Live-Req-Sys-${Date.now()}` } });
      }

      // 4. Create distinct tickets for User A
      const t1 = await realPrisma.ticket.create({
        data: {
          ticketNumber: `REQA-T1-${Date.now()}`,
          summary: "User A New Ticket",
          description: "Live DB requester test open ticket",
          priority: "Medium",
          status: "New",
          requesterId: userAId,
          categoryId: category.id,
          relatedSystemId: system.id,
        },
      });
      createdTicketIds.push(t1.id);

      const t2 = await realPrisma.ticket.create({
        data: {
          ticketNumber: `REQA-T2-${Date.now()}`,
          summary: "User A In Progress Ticket",
          description: "Live DB requester test in progress ticket",
          priority: "High",
          status: "In_Progress",
          requesterId: userAId,
          categoryId: category.id,
          relatedSystemId: system.id,
        },
      });
      createdTicketIds.push(t2.id);

      const t3 = await realPrisma.ticket.create({
        data: {
          ticketNumber: `REQA-T3-${Date.now()}`,
          summary: "User A Closed Ticket",
          description: "Live DB requester test closed ticket",
          priority: "Low",
          status: "Closed",
          requesterId: userAId,
          categoryId: category.id,
          relatedSystemId: system.id,
        },
      });
      createdTicketIds.push(t3.id);

      // 5. Create ticket for User B (Must remain isolated)
      const t4 = await realPrisma.ticket.create({
        data: {
          ticketNumber: `REQB-T4-${Date.now()}`,
          summary: "User B Open Ticket",
          description: "Live DB requester B ticket for isolation testing",
          priority: "Critical",
          status: "Open",
          requesterId: userBId,
          categoryId: category.id,
          relatedSystemId: system.id,
        },
      });
      createdTicketIds.push(t4.id);
    } catch (err: any) {
      isDbAvailable = false;
      if (process.env.CI) {
        throw new Error(
          `PostgreSQL database connection failed in CI environment: ${err.message}. requester-dashboard.db.test.ts cannot be bypassed in CI.`
        );
      }
      console.warn("PostgreSQL not reachable for requester dashboard DB test; skipping:", err.message);
    }
  });

  afterAll(async () => {
    if (isDbAvailable) {
      const realPrisma = getPrisma();
      try {
        if (createdTicketIds.length > 0) {
          await realPrisma.activityLog.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
          await realPrisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
          await realPrisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
        }
        if (userAId) await realPrisma.user.delete({ where: { id: userAId } });
        if (userBId) await realPrisma.user.delete({ where: { id: userBId } });
      } catch {}
      await realPrisma.$disconnect();
    }
  });

  it("proves real PostgreSQL metric aggregation and strict requester ownership isolation", async (ctx) => {
    if (!isDbAvailable) {
      ctx.skip();
      return;
    }

    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("recentTickets");
    expect(res.body).toHaveProperty("generatedAt");

    const { metrics, recentTickets } = res.body;

    // Verify User A counts
    expect(metrics.totalOpen).toBe(2); // New + In_Progress
    expect(metrics.inProgress).toBe(1);
    expect(metrics.closed).toBe(1);
    expect(metrics.closedCount).toBe(1);

    // Verify recent tickets strictly contain only User A tickets
    expect(recentTickets.length).toBe(3);
    for (const t of recentTickets) {
      expect(t.ticketNumber).toMatch(/^REQA-/);
      expect(t.ticketNumber).not.toMatch(/^REQB-/);
    }
  });
});
