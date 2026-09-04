import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const validPayload = {
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 7,
  priority: "High",
  summary: "Laptop battery drains in less than 30 minutes",
  description:
    "After applying the recent OS update last night, the battery drains extremely fast even while idle on desktop.",
};

describe("POST /api/tickets", () => {
  // TKT-01: Valid ticket creation
  it("TKT-01: creates a ticket and returns 201 with generated TKT- number and status New", async () => {
    const res = await request(app).post("/api/tickets").send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.status).toBe("New");
    expect(res.body.summary).toBe(validPayload.summary);
    expect(res.body.description).toBe(validPayload.description);
    expect(res.body.priority).toBe("High");
    expect(res.body.requesterId).toBe(1);
    expect(res.body.categoryId).toBe(2);
    expect(res.body.relatedSystemId).toBe(7);
    expect(res.body).toHaveProperty("createdAt");
    expect(res.body).toHaveProperty("updatedAt");
  });

  // TKT-02: Summary validation — too short
  it("TKT-02: rejects ticket with summary < 5 chars and returns 400", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({ ...validPayload, summary: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.stringContaining("Summary must be at least 5 characters")])
    );
  });

  // TKT-03: Invalid categoryId — foreign key rejected
  it("TKT-03: rejects ticket with invalid categoryId and returns 404", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({ ...validPayload, categoryId: 9999 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Invalid requester, category, or related system");
  });

  // Additional edge cases
  it("rejects ticket with missing description", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({ ...validPayload, description: "" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.stringContaining("Description must be at least 10 characters")])
    );
  });

  it("rejects ticket with invalid priority value", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({ ...validPayload, priority: "Urgent" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.stringContaining("priority is required and must be one of")])
    );
  });

  it("rejects ticket for inactive requester", async () => {
    // Inactive Tester has id=5 in the seed data
    const res = await request(app)
      .post("/api/tickets")
      .send({ ...validPayload, requesterId: 5 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Invalid requester, category, or related system");
  });

  it("generates sequential unique ticket numbers", async () => {
    const res1 = await request(app).post("/api/tickets").send(validPayload);
    const res2 = await request(app).post("/api/tickets").send({
      ...validPayload,
      summary: "Second test ticket for number check",
    });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    // Extract the numeric portion to verify sequential ordering
    const num1 = parseInt(res1.body.ticketNumber.split("-")[2], 10);
    const num2 = parseInt(res2.body.ticketNumber.split("-")[2], 10);
    expect(num2).toBeGreaterThan(num1);
  });
});
