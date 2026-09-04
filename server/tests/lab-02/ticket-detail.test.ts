import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Ticket Detail Endpoints (TKT-08, TKT-09)", () => {
  let requester1TicketId: number;
  let requester2TicketId: number;

  beforeAll(async () => {
    // Create a ticket owned by Requester 1
    const res1 = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: 1,
        categoryId: 2,
        relatedSystemId: 7,
        priority: "High",
        summary: "Ticket Detail Test for Requester 1",
        description: "Testing retrieval of full ticket details including attachments and relations.",
      });
    requester1TicketId = res1.body.id;

    // Create a ticket owned by Requester 2
    const res2 = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: 2,
        categoryId: 1,
        relatedSystemId: 1,
        priority: "Low",
        summary: "Ticket Detail Test for Requester 2",
        description: "Checking isolation barriers between different requesters.",
      });
    requester2TicketId = res2.body.id;
  });

  // TKT-08: GET /api/tickets/:id?requesterId=1 returns 200 with full details
  it("TKT-08: returns full ticket detail and relations for the ticket owner", async () => {
    const res = await request(app).get(`/api/tickets/${requester1TicketId}?requesterId=1`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", requester1TicketId);
    expect(res.body).toHaveProperty("ticketNumber");
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body).toHaveProperty("summary", "Ticket Detail Test for Requester 1");
    expect(res.body).toHaveProperty("description");
    expect(res.body).toHaveProperty("priority", "High");
    expect(res.body).toHaveProperty("status", "New");
    expect(res.body).toHaveProperty("requester");
    expect(res.body.requester).toHaveProperty("id", 1);
    expect(res.body).toHaveProperty("category");
    expect(res.body.category).toHaveProperty("id", 2);
    expect(res.body).toHaveProperty("relatedSystem");
    expect(res.body.relatedSystem).toHaveProperty("id", 7);
    expect(res.body).toHaveProperty("attachments");
    expect(Array.isArray(res.body.attachments)).toBe(true);
  });

  // TKT-09: GET /api/tickets/:id?requesterId=2 rejects unauthorized cross-requester access
  it("TKT-09: returns 404 unauthorized when another requester tries to view the ticket", async () => {
    const res = await request(app).get(`/api/tickets/${requester1TicketId}?requesterId=2`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/unauthorized|not found/i);
  });

  it("returns 400 Bad Request when requesterId is missing", async () => {
    const res = await request(app).get(`/api/tickets/${requester1TicketId}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "requesterId is required");
  });

  it("returns 404 Not Found for non-existent ticket ID", async () => {
    const res = await request(app).get("/api/tickets/999999?requesterId=1");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});
