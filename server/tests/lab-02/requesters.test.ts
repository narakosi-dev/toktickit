import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/requesters (REQ-01 / AC-01)", () => {
  it("returns HTTP 200 with only active requesters and excludes inactive", async () => {
    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThanOrEqual(4);

    // Verify all returned requesters are active
    for (const req of response.body) {
      expect(req.active).toBe(true);
      expect(req).toHaveProperty("id");
      expect(req).toHaveProperty("name");
      expect(req).toHaveProperty("email");
    }

    // Verify inactive requester is NOT in the list
    const emails = response.body.map((r: { email: string }) => r.email);
    expect(emails).not.toContain("inactive.tester@example.com");
  });
});
