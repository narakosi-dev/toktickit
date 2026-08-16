import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";


// Issue 4 — write this test yourself, using health.test.ts as the pattern.
// Requires the DB to be migrated and seeded first.
// It should assert: GET /api/categories returns 200 and the four seeded
// category names in id order.
describe("GET /api/categories", () => {
  it("returns the four seeded categories in id order", async () => {
    const response = await request(app).get("/api/categories");
    
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body).toHaveLength(4);
    
    expect(response.body[0].name).toBe("Account and Access");
    expect(response.body[1].name).toBe("Hardware");
    expect(response.body[2].name).toBe("Software");
    expect(response.body[3].name).toBe("Network");
  });
});
