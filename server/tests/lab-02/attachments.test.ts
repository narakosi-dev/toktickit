import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Attachment Lifecycle Endpoints (ATT-01 through ATT-06)", () => {
  let ticketId: number;
  let activeAttachmentId: number;
  let removedAttachmentId: number;

  beforeAll(async () => {
    // Create a dedicated ticket owned by Requester 1
    const res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: 1,
        categoryId: 2,
        relatedSystemId: 7,
        priority: "Medium",
        summary: "Attachment Testing Ticket",
        description: "Ticket created specifically for attachment lifecycle testing.",
      });
    ticketId = res.body.id;
  });

  // ATT-01: Upload valid attachment (PDF <= 5MB)
  it("ATT-01: uploads a valid PDF attachment successfully", async () => {
    const fakePdfBuffer = Buffer.from("%PDF-1.4 ... mock pdf content ...");
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", 1)
      .attach("file", fakePdfBuffer, {
        filename: "test-document.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("originalName", "test-document.pdf");
    expect(res.body).toHaveProperty("mimeType", "application/pdf");
    expect(res.body).toHaveProperty("active", true);
    expect(res.body).toHaveProperty("sizeBytes");
    activeAttachmentId = res.body.id;
  });

  // ATT-02: Reject invalid MIME type
  it("ATT-02: rejects unsupported file types (e.g. .exe)", async () => {
    const exeBuffer = Buffer.from("MZ mock executable");
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", 1)
      .attach("file", exeBuffer, {
        filename: "malware.exe",
        contentType: "application/x-msdownload",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Unsupported file type");
  });

  // ATT-03: Reject oversized file (> 5MB)
  it("ATT-03: rejects files exceeding the 5MB limit", async () => {
    // 5MB + 1KB buffer
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", 1)
      .attach("file", oversizedBuffer, {
        filename: "large-photo.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "File size exceeds 5MB limit");
  });

  // Download active attachment (Owner)
  it("downloads an active attachment successfully", async () => {
    const res = await request(app).get(
      `/api/attachments/${activeAttachmentId}/download?requesterId=1`
    );
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("test-document.pdf");
  });

  // ATT-05: Soft-remove attachment with valid reason
  it("ATT-05: soft-removes an attachment with mandatory audit reason", async () => {
    const res = await request(app)
      .patch(`/api/attachments/${activeAttachmentId}/remove`)
      .send({
        requesterId: 1,
        reason: "Uploaded file contained obsolete diagnostic logs",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", activeAttachmentId);
    expect(res.body).toHaveProperty("active", false);
    expect(res.body).toHaveProperty(
      "removalReason",
      "Uploaded file contained obsolete diagnostic logs"
    );
    expect(res.body).toHaveProperty("removedAt");
    expect(res.body.removedAt).not.toBeNull();
    removedAttachmentId = activeAttachmentId;
  });

  // Reject soft-remove with reason < 5 characters
  it("rejects soft-removal when reason is shorter than 5 characters", async () => {
    // First upload a new file to attempt removing
    const buffer = Buffer.from("image content");
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", 1)
      .attach("file", buffer, {
        filename: "screenshot.png",
        contentType: "image/png",
      });
    const newAttId = uploadRes.body.id;

    const res = await request(app)
      .patch(`/api/attachments/${newAttId}/remove`)
      .send({
        requesterId: 1,
        reason: "bad",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty(
      "error",
      "Removal reason must be at least 5 characters"
    );
  });

  // Reject soft-remove on an already removed attachment (409 Conflict)
  it("returns 409 Conflict when attempting to remove an already removed attachment", async () => {
    const res = await request(app)
      .patch(`/api/attachments/${removedAttachmentId}/remove`)
      .send({
        requesterId: 1,
        reason: "Trying to remove again",
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error", "Attachment is already removed");
  });

  // ATT-06: Block download on soft-removed attachment (410 Gone)
  it("ATT-06: returns 410 Gone when attempting to download a soft-removed attachment", async () => {
    const res = await request(app).get(
      `/api/attachments/${removedAttachmentId}/download?requesterId=1`
    );
    expect(res.status).toBe(410);
    expect(res.body).toHaveProperty(
      "error",
      "This attachment has been removed and cannot be downloaded"
    );
  });

  // Cross-requester security isolation checks
  it("rejects cross-requester attachment download (returns 404)", async () => {
    const res = await request(app).get(
      `/api/attachments/${removedAttachmentId}/download?requesterId=2`
    );
    expect(res.status).toBe(404);
  });

  it("rejects cross-requester attachment removal (returns 404)", async () => {
    const res = await request(app)
      .patch(`/api/attachments/${removedAttachmentId}/remove`)
      .send({
        requesterId: 2,
        reason: "Unauthorized attempt",
      });
    expect(res.status).toBe(404);
  });

  // ATT-04: Maximum 5 active attachments limit
  it("ATT-04: enforces a maximum of 5 active attachments per ticket", async () => {
    // Create a fresh ticket for this test
    const tRes = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1,
        priority: "Low",
        summary: "Max 5 Attachments Ticket",
        description: "Checking that the 6th active attachment upload is rejected.",
      });
    const freshTicketId = tRes.body.id;

    // Upload 5 active attachments
    for (let i = 1; i <= 5; i++) {
      const upRes = await request(app)
        .post(`/api/tickets/${freshTicketId}/attachments`)
        .field("requesterId", 1)
        .attach("file", Buffer.from(`file content ${i}`), {
          filename: `doc-${i}.pdf`,
          contentType: "application/pdf",
        });
      expect(upRes.status).toBe(201);
    }

    // Attempt to upload 6th attachment -> should fail with 400
    const sixthRes = await request(app)
      .post(`/api/tickets/${freshTicketId}/attachments`)
      .field("requesterId", 1)
      .attach("file", Buffer.from("sixth file content"), {
        filename: "doc-6.pdf",
        contentType: "application/pdf",
      });

    expect(sixthRes.status).toBe(400);
    expect(sixthRes.body).toHaveProperty(
      "error",
      "Maximum 5 active attachments allowed per ticket"
    );
  });
});
