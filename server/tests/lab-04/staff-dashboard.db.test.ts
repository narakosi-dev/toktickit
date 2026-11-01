import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma, setPrisma } from "../../src/prisma.js";
import { signToken } from "../../src/auth.js";

describe("PostgreSQL Real IT Staff Dashboard DB Integration Test (staff-dashboard.db.test.ts)", () => {
  let isDbAvailable = false;
  let staffToken: string;
  let staffUserId: number;
  let createdTicketIds: number[] = [];
  const prisma = getPrisma();

  beforeAll(async () => {
    // Ensure real prisma client is used
    setPrisma(null);
    const realPrisma = getPrisma();

    try {
      // 1. Verify live database connection
      await realPrisma.$connect();
      await realPrisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;

      // 2. Resolve or create staff user
      let staff = await realPrisma.user.findFirst({
        where: { role: "IT_Staff", isActive: true, mustChangePassword: false },
      });
      if (!staff) {
        staff = await realPrisma.user.create({
          data: {
            email: `dsh-staff-${Date.now()}@toktick.local`,
            name: "Dashboard Live Test Staff",
            passwordHash: "mockHash",
            role: "IT_Staff",
            isActive: true,
            mustChangePassword: false,
          },
        });
      }
      staffUserId = staff.id;

      staffToken = signToken({
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        mustChangePassword: false,
      });

      // 3. Resolve or create category, system, requester
      let category = await realPrisma.category.findFirst();
      if (!category) {
        category = await realPrisma.category.create({ data: { name: `DSH-Cat-${Date.now()}` } });
      }

      let system = await realPrisma.relatedSystem.findFirst();
      if (!system) {
        system = await realPrisma.relatedSystem.create({ data: { name: `DSH-Sys-${Date.now()}` } });
      }

      let requester = await realPrisma.user.findFirst({ where: { role: "Requester" } });
      if (!requester) {
        requester = staff;
      }

      // 4. Create distinct test tickets in live Postgres
      const t1 = await realPrisma.ticket.create({
        data: {
          ticketNumber: `DSH-T1-${Date.now()}`,
          summary: "Live DB Unassigned Critical Ticket",
          description: "Live DB unassigned critical ticket testing query OR and order",
          priority: "Critical",
          itPriority: null,
          status: "Open",
          assignedToId: null,
          requesterId: requester.id,
          categoryId: category.id,
          relatedSystemId: system.id,
        },
      });
      createdTicketIds.push(t1.id);

      const t2 = await realPrisma.ticket.create({
        data: {
          ticketNumber: `DSH-T2-${Date.now()}`,
          summary: "Live DB Staff Assigned Downgraded Critical Ticket",
          description: "Live DB assigned ticket with itPriority override to critical",
          priority: "Low",
          itPriority: "Critical", // staff override to critical
          status: "In_Progress",
          assignedToId: staffUserId,
          requesterId: requester.id,
          categoryId: category.id,
          relatedSystemId: system.id,
        },
      });
      createdTicketIds.push(t2.id);

      const t3 = await realPrisma.ticket.create({
        data: {
          ticketNumber: `DSH-T3-${Date.now()}`,
          summary: "Live DB Closed Critical Ticket",
          description: "Live DB closed critical ticket should be excluded from active aggregations",
          priority: "Critical",
          itPriority: null,
          status: "Closed",
          assignedToId: staffUserId,
          requesterId: requester.id,
          categoryId: category.id,
          relatedSystemId: system.id,
        },
      });
      createdTicketIds.push(t3.id);
    } catch (err: any) {
      isDbAvailable = false;
      if (process.env.CI) {
        throw new Error(
          `PostgreSQL database connection failed in CI environment: ${err.message}. staff-dashboard.db.test.ts cannot be bypassed in CI.`
        );
      }
      console.warn("PostgreSQL not reachable for staff dashboard DB test; skipping:", err.message);
    }
  });

  afterAll(async () => {
    if (isDbAvailable && createdTicketIds.length > 0) {
      const realPrisma = getPrisma();
      try {
        await realPrisma.activityLog.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await realPrisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await realPrisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
      } catch {}
      await realPrisma.$disconnect();
    }
  });

  it("exercises real PostgreSQL database aggregation (count, groupBy, OR with null, select)", async (ctx) => {
    if (!isDbAvailable) {
      ctx.skip();
      return;
    }

    const res = await request(app)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("urgentTickets");
    expect(res.body).toHaveProperty("recentUpdatedTickets");
    expect(res.body).toHaveProperty("generatedAt");

    const { metrics, urgentTickets, recentUpdatedTickets } = res.body;

    // Metrics structure
    expect(metrics).toHaveProperty("unassignedCount");
    expect(metrics).toHaveProperty("myAssignedCount");
    expect(metrics).toHaveProperty("statusBreakdown");
    expect(metrics).toHaveProperty("priorityBreakdown");
    expect(typeof metrics.unassignedCount).toBe("number");
    expect(typeof metrics.myAssignedCount).toBe("number");

    // Urgent tickets evaluation: verify real Postgres query OR: [{ itPriority: 'Critical' }, { itPriority: null, priority: 'Critical' }]
    expect(Array.isArray(urgentTickets)).toBe(true);
    for (const ticket of urgentTickets) {
      const eff = ticket.itPriority || ticket.priority;
      expect(eff).toBe("Critical");
      expect(["Closed", "Cancelled"]).not.toContain(ticket.status);
      expect(ticket).toHaveProperty("ticketNumber");
      expect(ticket).toHaveProperty("summary");
    }

    // Recent updated tickets evaluation
    expect(Array.isArray(recentUpdatedTickets)).toBe(true);
    expect(recentUpdatedTickets.length).toBeLessThanOrEqual(5);
  });
});
