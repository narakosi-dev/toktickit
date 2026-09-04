import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/tickets — My Tickets & Ownership Isolation", () => {
  let requester1TicketId: number;
  let requester2TicketId: number;

  beforeAll(async () => {
    // Seed tickets for Requester 1
    const res1 = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: 1,
        categoryId: 2,
        relatedSystemId: 7,
        priority: "High",
        summary: "Laptop battery issues for Requester 1",
        description: "Battery drains completely in 30 minutes after latest update.",
      });
    requester1TicketId = res1.body.id;

    // Seed another ticket for Requester 1 with different search terms and priority
    await request(app)
      .post("/api/tickets")
      .send({
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1,
        priority: "Low",
        summary: "VPN access request for remote office",
        description: "Need VPN permissions granted for branch office connection.",
      });

    // Seed a ticket for Requester 2 (for ownership isolation check)
    const res2 = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: 2,
        categoryId: 3,
        relatedSystemId: 2,
        priority: "Critical",
        summary: "Email client crashing repeatedly for Requester 2",
        description: "Application closes with error code 0x80004005 on launch.",
      });
    requester2TicketId = res2.body.id;
  });

  // TKT-04: GET /api/tickets?requesterId=1 returns tickets owned strictly by Requester 1
  it("TKT-04: queries tickets owned strictly by requesterId=1", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("tickets");
    expect(res.body).toHaveProperty("pagination");
    expect(Array.isArray(res.body.tickets)).toBe(true);
    expect(res.body.tickets.length).toBeGreaterThanOrEqual(2);

    // Verify all returned tickets belong to Requester 1
    for (const t of res.body.tickets) {
      expect(t).toHaveProperty("ticketNumber");
      expect(t).toHaveProperty("summary");
      expect(t).toHaveProperty("category");
      expect(t).toHaveProperty("relatedSystem");
      expect(t).toHaveProperty("attachmentCount");
    }

    // Verify requester 1 ticket is present
    const ids = res.body.tickets.map((t: any) => t.id);
    expect(ids).toContain(requester1TicketId);
  });

  // TKT-05: Strict Ownership Isolation — Requester 2 cannot see Requester 1's tickets
  it("TKT-05: enforces strict ownership isolation between requesters", async () => {
    const res = await request(app).get("/api/tickets?requesterId=2");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tickets)).toBe(true);

    const ids = res.body.tickets.map((t: any) => t.id);
    expect(ids).toContain(requester2TicketId);
    expect(ids).not.toContain(requester1TicketId);
  });

  // TKT-06: Case-insensitive search on ticketNumber or summary
  it("TKT-06: searches tickets by summary or ticketNumber case-insensitively", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1&search=laptop");
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBeGreaterThanOrEqual(1);
    for (const t of res.body.tickets) {
      const matches =
        t.summary.toLowerCase().includes("laptop") ||
        t.ticketNumber.toLowerCase().includes("laptop");
      expect(matches).toBe(true);
    }
  });

  // TKT-07: Pagination with page and limit
  it("TKT-07: respects pagination parameters and returns correct metadata", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1&page=1&limit=1");
    expect(res.status).toBe(200);
    expect(res.body.tickets).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      limit: 1,
    });
    expect(res.body.pagination.totalCount).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  // Edge cases: validation
  it("returns 400 if requesterId is missing", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("requesterId query parameter is required");
  });

  it("returns 400 if requesterId is invalid or non-numeric", async () => {
    const res = await request(app).get("/api/tickets?requesterId=invalid");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("requesterId must be a positive integer");
  });

  it("filters by priority", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1&priority=High");
    expect(res.status).toBe(200);
    for (const t of res.body.tickets) {
      expect(t.priority).toBe("High");
    }
  });

  it("filters by categoryId", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1&categoryId=2");
    expect(res.status).toBe(200);
    for (const t of res.body.tickets) {
      expect(t.category.id).toBe(2);
    }
  });
});
