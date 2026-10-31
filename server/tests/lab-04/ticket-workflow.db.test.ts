import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "toktickit-dev-jwt-secret-do-not-use-in-production-min-32-chars";

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

      // 2. Resolve or create staff user
      let staff = await prisma.user.findFirst({ where: { role: "IT_Staff", isActive: true } });
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

      staffToken = jwt.sign(
        { id: staff.id, email: staff.email, role: staff.role, name: staff.name, mustChangePassword: false },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

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
      console.warn("PostgreSQL not reachable for live integration test; skipping DB test:", err.message);
      isDbAvailable = false;
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

  it("proves PostgreSQL atomic OCC CAS: two concurrent transitions with identical version yield exactly 1 winner (200) and 1 conflict (409)", async () => {
    if (!isDbAvailable) {
      console.log("Skipping live PostgreSQL race test (DB not available in current environment)");
      return;
    }

    // Both requests attempt New -> Open from version: 1 simultaneously
    const [res1, res2] = await Promise.all([
      request(app)
        .patch(`/api/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Open", version: 1 }),
      request(app)
        .patch(`/api/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "Open", version: 1 }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // In PostgreSQL, atomic CAS guarantees exactly one winner (200) and one conflict (409)
    expect(statuses).toEqual([200, 409]);

    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.code).toBe("CONCURRENCY_CONFLICT");
    expect(conflictRes.body.currentVersion).toBe(2);

    const winningRes = res1.status === 200 ? res1 : res2;
    expect(winningRes.body.status).toBe("Open");
    expect(winningRes.body.version).toBe(2);

    // Verify true database state in PostgreSQL
    const liveTicket = await prisma.ticket.findUnique({ where: { id: testTicketId } });
    expect(liveTicket?.version).toBe(2);
    expect(liveTicket?.status).toBe("Open");
  });
});
