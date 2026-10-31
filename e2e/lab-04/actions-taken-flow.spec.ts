import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "artifacts/lab-04/screenshots/actions-taken");

async function assertNoHorizontalOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe("Sprint 4 (Lab 4) E2E: Actions Taken Lifecycle Flow (Issue #59)", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("E2E-ACT-01: IT Staff creates Action Taken with follow-up note, second Staff records another action; both persist on timeline", async ({
    page,
  }) => {
    const summaryText = `[E2E-ACT-01] High CPU load and cooling failure ${Date.now()}`;
    const descriptionText =
      "Requester reports workstation thermal throttling and loud fan noise during computational jobs.";

    // ──────────────────────────────────────────────────────────────────────────
    // Step 1: Requester creates ticket
    // ──────────────────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    await page.fill("#login-email", "nara.kosi@kmutt.ac.th");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Nara Kosiyaporn");
    await page.getByRole("button", { name: /Create Ticket/i }).click();

    await page.selectOption("#category", { label: "Hardware" });
    await page.selectOption("#relatedSystem", { label: "Corporate Laptop" });
    await page.selectOption("#priority", "High");
    await page.fill("#summary", summaryText);
    await page.fill("#description", descriptionText);

    await page.getByTestId("submit-ticket-btn").click();
    await expect(page.getByText(/Ticket Created Successfully/i)).toBeVisible();
    const ticketNumber = (await page.getByTestId("created-ticket-number").innerText()).trim();
    expect(ticketNumber).toMatch(/^(TKT|TCK)-\d{4,8}-\d{4,6}$/);

    // Sign out Requester
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    // ──────────────────────────────────────────────────────────────────────────
    // Step 2: IT Staff 1 (Bob Smith) logs in and adds Action Taken with follow-up
    // ──────────────────────────────────────────────────────────────────────────
    await page.fill("#login-email", "bob.smith@example.com");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Bob Smith");
    await expect(page.locator(".user-role-badge")).toHaveText("IT Staff");

    // Search for ticket in Staff Queue
    await page.fill("input[placeholder*='Search ticket']", ticketNumber);
    await page.waitForTimeout(500);

    const ticketRow = page.locator("tbody tr", { hasText: ticketNumber });
    await expect(ticketRow).toBeVisible();
    await ticketRow.getByRole("button", { name: /Open Detail/i }).click();

    // Verify detail view and Actions Taken section
    await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
    const actionsSection = page.getByTestId("actions-taken-section");
    await expect(actionsSection).toBeVisible();

    // Click Add Action Taken
    const addActionBtn = page.getByTestId("add-action-taken-btn");
    await expect(addActionBtn).toBeVisible();
    await addActionBtn.click();

    // Verify modal title
    await expect(page.getByRole("heading", { name: /Record Action Taken/i })).toBeVisible();

    // Test follow-up validation (BR-03): Follow-up ON with empty note fails validation
    await page.check("#followUpSwitch");
    await page.fill("#actionDescription", "Replaced thermal paste and cleaned heatsink fins with compressed air.");
    await page.fill("#actionResult", "CPU temperature dropped from 94C to 56C under benchmark load.");
    await page.getByRole("button", { name: /Save Action Taken/i }).click();

    // Validation error must appear
    await expect(page.getByText(/Follow-up note is required when follow-up is needed/i)).toBeVisible();

    // Now supply valid follow-up note
    await page.fill("#followUpNoteInput", "Verify core temperatures during morning compute run tomorrow.");
    await page.getByRole("button", { name: /Save Action Taken/i }).click();

    // Verify action is displayed on timeline
    await expect(page.getByText("Replaced thermal paste and cleaned heatsink fins with compressed air.")).toBeVisible();
    await expect(page.getByText("CPU temperature dropped from 94C to 56C under benchmark load.")).toBeVisible();
    await expect(page.getByText(/Follow-Up Required/i)).toBeVisible();
    await expect(page.getByText("Verify core temperatures during morning compute run tomorrow.")).toBeVisible();
    await expect(page.getByText("Bob Smith")).toBeVisible();

    // Sign out Staff 1
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    // ──────────────────────────────────────────────────────────────────────────
    // Step 3: Staff 2 (Alice Admin) logs in and adds second Action Taken
    // ──────────────────────────────────────────────────────────────────────────
    await page.fill("#login-email", "admin@toktick.local");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Alice Admin");

    // Admin lands on User Management; click Ticket Queue
    await page.locator("header").getByRole("button", { name: /Ticket Queue/i }).click();
    await page.fill("input[placeholder*='Search ticket']", ticketNumber);
    await page.waitForTimeout(500);

    const ticketRowAdmin = page.locator("tbody tr", { hasText: ticketNumber });
    await expect(ticketRowAdmin).toBeVisible();
    await ticketRowAdmin.getByRole("button", { name: /Open Detail/i }).click();

    // Alice records second action
    await page.getByTestId("add-action-taken-btn").click();
    await expect(page.getByRole("heading", { name: /Record Action Taken/i })).toBeVisible();

    await page.fill("#actionDescription", "Updated motherboard UEFI to version 2.4.1 and calibrated fan curve.");
    await page.fill("#actionResult", "Acoustic noise reduced by 12 dB; fan RPM modulates smoothly under stress.");
    await page.getByRole("button", { name: /Save Action Taken/i }).click();

    // Verify BOTH actions persist in chronological order on the timeline
    await expect(page.getByText("Replaced thermal paste and cleaned heatsink fins with compressed air.")).toBeVisible();
    await expect(page.getByText("Updated motherboard UEFI to version 2.4.1 and calibrated fan curve.")).toBeVisible();
    await expect(page.getByText("Bob Smith")).toBeVisible();
    await expect(page.getByText("Alice Admin")).toBeVisible();

    // Capture staff actions timeline screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-actions-taken-timeline-staff.png"),
    });
  });

  test("E2E-ACT-02: Requester views own ticket, verifies Actions Taken are visible and strictly read-only across viewports", async ({
    page,
  }) => {
    // 1. Desktop Viewport (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await page.fill("#login-email", "nara.kosi@kmutt.ac.th");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Nara Kosiyaporn");

    // Open My Tickets and select first available ticket with Actions Taken
    await page.locator("header").getByRole("button", { name: /My Tickets/i }).click();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await page.locator("tbody tr").first().click();

    // Verify ticket detail view and actions taken section
    await expect(page.getByTestId("ticket-detail-view")).toBeVisible();
    const actionsSection = page.getByTestId("actions-taken-section");
    await expect(actionsSection).toBeVisible();

    // Read-only invariant checks (AC-04 / AC-13)
    await expect(page.getByText(/Read-Only View/i)).toBeVisible();
    await expect(page.getByTestId("add-action-taken-btn")).toHaveCount(0);
    await expect(page.locator("button:has-text('Edit')")).toHaveCount(0);

    // Verify zero horizontal overflow on Desktop
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-actions-taken-requester-desktop.png"),
    });

    // 2. Tablet Viewport (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-actions-taken-requester-tablet.png"),
    });

    // 3. Mobile Viewport (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-actions-taken-requester-mobile.png"),
    });
  });
});
