import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signToken } from "../../src/auth.js";

describe("PostgreSQL Real Atomic Concurrency Control (OCC) Integration Test", () => {
  let isDbAvailable = false;
  let testTicketId: number;
  let staffToken: string;
  const prisma = getPrisma();

  beforeAll(async () => {
    try {
      // 1. Verify live database connection
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;

      // 2. Resolve or create staff user with mustChangePassword = false
      let staff = await prisma.user.findFirst({
        where: { role: "IT_Staff", isActive: true, mustChangePassword: false },
      });
      if (!staff) {
        staff = await prisma.user.create({
          data: {
            email: `occ-staff-${Date.now()}@toktick.local`,
            name: "OCC Live Test Staff",
            passwordHash: "mockHash",
            role: "IT_Staff",
            isActive: true,
            mustChangePassword: false,
          },
        });
      }

      staffToken = signToken({
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        mustChangePassword: false,
      });

      // 3. Resolve or create necessary category & system
      let category = await prisma.category.findFirst();
      if (!category) {
        category = await prisma.category.create({ data: { name: `OCC-Cat-${Date.now()}` } });
      }

      let system = await prisma.relatedSystem.findFirst();
      if (!system) {
        system = await prisma.relatedSystem.create({ data: { name: `OCC-Sys-${Date.now()}` } });
      }

      let requester = await prisma.user.findFirst({ where: { role: "Requester" } });
      if (!requester) {
        requester = staff;
      }

      // 4. Create dedicated live ticket in 'New' status at version 1
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `OCC-LIVE-${Date.now()}`,
          summary: "Live PostgreSQL OCC Race Condition Test Ticket",
          description: "Testing true database-level atomic CAS under concurrent load",
          priority: "Medium",
          status: "New",
          version: 1,
          requesterId: requester.id,
          categoryId: category.id,
          relatedSystemId: system.id,
        },
      });
      testTicketId = ticket.id;
    } catch (err: any) {
      isDbAvailable = false;
      if (process.env.CI) {
        throw new Error(
          `PostgreSQL database connection failed in CI environment: ${err.message}. ticket-workflow.db.test.ts cannot be bypassed in CI.`
        );
      }
      console.warn("PostgreSQL not reachable for live integration test in local environment; skipping DB test:", err.message);
    }
  });

  afterAll(async () => {
    if (isDbAvailable && testTicketId) {
      try {
        await prisma.activityLog.deleteMany({ where: { ticketId: testTicketId } });
        await prisma.actionTaken.deleteMany({ where: { ticketId: testTicketId } });
        await prisma.ticket.delete({ where: { id: testTicketId } });
      } catch {}
    }
    await prisma.$disconnect();
  });

  it.skipIf(!isDbAvailable && !process.env.CI)(
    "proves PostgreSQL atomic OCC CAS: two concurrent transitions with identical version yield exactly 1 winner (200) and 1 conflict (409)",
    async () => {
      if (process.env.CI && !isDbAvailable) {
        throw new Error(
          "PostgreSQL database connection failed in CI environment: live DB race condition test must execute."
        );
      }

      // Both requests attempt valid transitions from New (version 1) simultaneously
      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/tickets/${testTicketId}/status`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({ status: "Open", version: 1 }),
        request(app)
          .patch(`/api/tickets/${testTicketId}/status`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({ status: "Cancelled", version: 1 }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // In PostgreSQL, atomic CAS guarantees exactly one winner (200) and one conflict (409)
      expect(statuses).toEqual([200, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.code).toBe("CONCURRENCY_CONFLICT");
      expect(conflictRes.body.currentVersion).toBe(2);

      const winningRes = res1.status === 200 ? res1 : res2;
      expect(["Open", "Cancelled"]).toContain(winningRes.body.status);
      expect(winningRes.body.version).toBe(2);

      // Verify true database state in PostgreSQL
      const liveTicket = await prisma.ticket.findUnique({ where: { id: testTicketId } });
      expect(liveTicket?.version).toBe(2);
      expect(["Open", "Cancelled"]).toContain(liveTicket?.status);
    }
  );
});
