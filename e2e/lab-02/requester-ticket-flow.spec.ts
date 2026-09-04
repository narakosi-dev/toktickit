import { test, expect } from "@playwright/test";

test.describe("Sprint 2 (Lab 2) E2E Requester Ticket Flow (E2E-01)", () => {
  const timestamp = Date.now();
  const testSummary = `E2E Network Gateway Issue ${timestamp}`;
  const testDescription = `Automated end-to-end test ticket verifying full workflow from creation to detail and attachments. Timestamp: ${timestamp}`;
  let createdTicketNumber = "";

  test("E2E-01: complete requester journey with ticket creation, detail, attachments, and isolation", async ({
    page,
  }) => {
    // 1. Visit Application root & Requester Selection screen (AC-02)
    await page.goto("/");
    await expect(page.getByText("Select Development Requester")).toBeVisible();

    // Select "Jennifer Anderson"
    await page.selectOption("#requester-select", { label: "Jennifer Anderson (jennifer.anderson@example.com)" });
    await page.getByRole("button", { name: /Continue/i }).click();

    // 2. Verify Application Shell & Requester Identity Header (AC-03)
    await expect(page.getByText("Jennifer Anderson")).toBeVisible();
    await expect(page.getByText("jennifer.anderson@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /Change Requester/i })).toBeVisible();

    // 3. Navigate to Create Ticket & Fill Form (AC-04)
    await page.getByRole("button", { name: /Create Ticket/i }).click();
    await expect(page.getByRole("heading", { name: /Create IT Support Ticket/i })).toBeVisible();

    // Select category and system
    await page.selectOption("#category", { index: 1 });
    await page.selectOption("#relatedSystem", { index: 1 });
    await page.selectOption("#priority", "High");
    await page.fill("#summary", testSummary);
    await page.fill("#description", testDescription);

    // Submit Ticket
    await page.getByRole("button", { name: /Submit Ticket/i }).click();

    // 4. Verify Creation Confirmation & Generated Ticket Number (AC-04, BR-01)
    await expect(page.getByText(/Ticket Created Successfully/i)).toBeVisible();
    const ticketNumberElement = page.getByTestId("created-ticket-number");
    await expect(ticketNumberElement).toBeVisible();
    createdTicketNumber = (await ticketNumberElement.textContent())?.trim() || "";
    expect(createdTicketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);

    // 5. Navigate to My Tickets & Verify Search/Filter (AC-07, AC-09)
    await page.getByRole("button", { name: /View My Tickets/i }).click();
    await expect(page.getByRole("heading", { name: /My Tickets/i })).toBeVisible();

    // Search by Ticket Number
    await page.fill('[data-testid="search-tickets-input"]', createdTicketNumber);
    await expect(page.getByText(testSummary).first()).toBeVisible();

    // 6. Open Ticket Detail View (AC-08, UI-07)
    await page.getByText(createdTicketNumber).first().click();
    await expect(page.getByTestId("ticket-number")).toHaveText(createdTicketNumber);
    await expect(page.getByText(testSummary)).toBeVisible();
    await expect(page.getByText(testDescription)).toBeVisible();
    await expect(page.getByText("High Priority")).toBeVisible();

    // 7. Upload Diagnostic Attachment (AC-11, ATT-01)
    const fileInput = page.locator("#attachment-file-input");
    await fileInput.setInputFiles({
      name: "diagnostic-report.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 ... E2E Diagnostic Test Content ..."),
    });

    await expect(page.getByText("diagnostic-report.pdf")).toBeVisible();
    await expect(page.getByText("(1 / 5 active attachments)")).toBeVisible();
    await expect(page.getByRole("link", { name: /Download/i })).toBeVisible();

    // 8. Soft-Remove Attachment with Audit Reason (AC-13, ATT-05, BR-07)
    await page.getByRole("button", { name: /Remove/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Remove Attachment")).toBeVisible();

    // Enforce >= 5 chars reason
    const confirmBtn = page.getByRole("button", { name: /Confirm Removal/i });
    expect(await confirmBtn.isDisabled()).toBe(true);

    await page.fill("#removal-reason-input", "Log file contains sensitive employee network data");
    expect(await confirmBtn.isEnabled()).toBe(true);
    await confirmBtn.click();

    // Verify modal closes and UI updates to "Removed" with reason
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Removed", { exact: true })).toBeVisible();
    await expect(page.getByText(/Log file contains sensitive employee network data/)).toBeVisible();
    await expect(page.getByText("Download unavailable")).toBeVisible();

    // 9. Verify Cross-Requester Ownership Barrier (AC-07, AC-08, BR-05)
    // Switch to Michael Brown
    await page.getByRole("button", { name: /Change Requester/i }).click();
    await expect(page.getByText("Select Development Requester")).toBeVisible();
    await page.selectOption("#requester-select", { label: "Michael Brown (michael.brown@example.com)" });
    await page.getByRole("button", { name: /Continue/i }).click();

    // Header updates to Michael Brown
    await expect(page.getByText("Michael Brown")).toBeVisible();

    // Navigate to My Tickets & search for Jennifer's ticket number
    await page.getByRole("button", { name: /My Tickets/i }).click();
    await page.fill('[data-testid="search-tickets-input"]', createdTicketNumber);

    // Jennifer's ticket must NOT appear in Michael Brown's ticket list
    await expect(page.getByText(testSummary)).toHaveCount(0);
    await expect(page.getByTestId("no-results-view")).toBeVisible();

    // 10. Multi-Viewport Responsiveness (AC-15)
    // Tablet Viewport (800x1024)
    await page.setViewportSize({ width: 800, height: 1024 });
    let scrollOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(scrollOverflow).toBeLessThanOrEqual(1);

    // Mobile Viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    scrollOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(scrollOverflow).toBeLessThanOrEqual(1);

    // Desktop Viewport (1200x800)
    await page.setViewportSize({ width: 1200, height: 800 });
    scrollOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(scrollOverflow).toBeLessThanOrEqual(1);
  });
});
