import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/related-systems (SYS-01)", () => {
  it("returns HTTP 200 with at least 6 seeded related systems", async () => {
    const response = await request(app).get("/api/related-systems");

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThanOrEqual(6);

    const names = response.body.map((s: { name: string }) => s.name);
    expect(names).toContain("Email");
    expect(names).toContain("Campus Wi-Fi");
    expect(names).toContain("VPN");
    expect(names).toContain("LEB2 App");
    expect(names).toContain("Grade Submission App");
    expect(names).toContain("Corporate Laptop");
  });
});
