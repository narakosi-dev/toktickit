import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/staff-flow");

async function assertNoHorizontalOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe("Sprint 3 (Lab 3) E2E: Staff Ticket Lifecycle Flow (Issue #35)", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("TC-E2E-STAFF-01: full ticket lifecycle — creation, triage, priority override, internal notes, resolution indication, and formal closure", async ({
    page,
  }) => {
    const summaryText = `[E2E] VPN connectivity drop during peak hours ${Date.now()}`;
    const descriptionText =
      "Detailed diagnostic: Users report recurring disconnects when connecting to VPN between 14:00 and 16:00.";
    const internalNoteText =
      "Staff Internal Note: Diagnosed flapping gateway interface on core switch SW-02. Scheduled reboot.";
    const publicCommentText =
      "IT Staff Update: We have identified the failing core switch route and stabilized traffic.";

    // ──────────────────────────────────────────────────────────────────────────
    // Step 1: Requester creates a High-priority ticket
    // ──────────────────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/");
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    await page.fill("#login-email", "alice.johnson@example.com");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Alice Johnson");
    await expect(page.locator(".user-role-badge")).toHaveText("Requester");

    // Navigate to Create Ticket
    await page.getByRole("button", { name: /Create Ticket/i }).click();
    await expect(page.getByRole("heading", { name: /Create IT Support Ticket/i })).toBeVisible();

    // Fill form fields
    await page.selectOption("#category", { label: "Network" });
    await page.selectOption("#relatedSystem", { label: "VPN" });
    await page.selectOption("#priority", "High");
    await page.fill("#summary", summaryText);
    await page.fill("#description", descriptionText);

    // Submit ticket
    await page.getByTestId("submit-ticket-btn").click();

    // Verify confirmation and extract ticket number
    await expect(page.getByText(/Ticket Created Successfully/i)).toBeVisible();
    const ticketNumber = (await page.getByTestId("created-ticket-number").innerText()).trim();
    expect(ticketNumber).toMatch(/^(TKT|TCK)-\d{4,8}-\d{4,6}$/);

    // Sign out Requester
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    // ──────────────────────────────────────────────────────────────────────────
    // Step 2: IT Staff claims ticket, overrides priority, transitions status
    // ──────────────────────────────────────────────────────────────────────────
    await page.fill("#login-email", "charlie.staff@toktick.local");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Charlie Staff");
    await expect(page.locator(".user-role-badge")).toHaveText("IT Staff");

    // Land on Ticket Queue
    await expect(page.getByRole("heading", { name: /IT Support Queue/i })).toBeVisible();

    // Search for newly created ticket
    await page.fill("input[placeholder*='Search ticket']", ticketNumber);
    await page.waitForTimeout(500); // debounce

    // Open detail
    const ticketRow = page.locator("tbody tr", { hasText: ticketNumber });
    await expect(ticketRow).toBeVisible();
    await ticketRow.getByRole("button", { name: /Open Detail/i }).click();

    // Verify detail page
    await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
    await expect(page.getByText(summaryText)).toBeVisible();

    // Claim Ticket
    const claimBtn = page.getByRole("button", { name: /Claim Ticket/i });
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(page.getByText("Ticket claimed successfully")).toBeVisible();
    }

    // Override IT Priority to Critical
    await page.selectOption("#staff-priority-select", "Critical");
    await page.getByRole("button", { name: /Set Priority/i }).click();
    await expect(page.getByText("IT priority updated")).toBeVisible();
    await expect(page.getByText("IT: Critical")).toBeVisible();

    // Transition Status to In Progress
    await page.selectOption("#staff-status-select", "In_Progress");
    await page.getByRole("button", { name: /Update Status/i }).click();
    await expect(page.getByText(/Status transitioned to In Progress/i)).toBeVisible();
    await expect(page.locator(".badge-status-inprogress")).toBeVisible();

    // ──────────────────────────────────────────────────────────────────────────
    // Step 3: Add Confidential Internal Note & Public Comment
    // ──────────────────────────────────────────────────────────────────────────
    // Switch to Internal Notes Tab
    await page.getByRole("tab", { name: /Internal Notes/i }).click();
    await expect(page.getByText(/Staff Eyes Only/i)).toBeVisible();

    // Save internal note
    await page.fill("#internal-note-input", internalNoteText);
    await page.getByRole("button", { name: /Save Internal Note/i }).click();
    await expect(page.getByText(internalNoteText)).toBeVisible();

    // Switch to Public Comments Tab
    await page.getByRole("tab", { name: /Public Conversation/i }).click();
    await expect(page.getByText(/Public comments are visible to the Requester/i)).toBeVisible();

    // Post public comment
    await page.fill("#public-comment-input", publicCommentText);
    await page.getByRole("button", { name: /Post Public Comment/i }).click();
    await expect(page.getByText(publicCommentText)).toBeVisible();

    // Capture Desktop Staff Detail View
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-staff-ticket-detail-desktop.png"),
    });

    // Capture Internal Notes Tab Screenshot
    await page.getByRole("tab", { name: /Internal Notes/i }).click();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-staff-internal-notes-tab.png"),
    });

    // Sign out Staff
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    // ──────────────────────────────────────────────────────────────────────────
    // Step 4: Requester verifies public comment, verifies note isolation, indicates resolved
    // ──────────────────────────────────────────────────────────────────────────
    await page.fill("#login-email", "alice.johnson@example.com");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Alice Johnson");

    // Open My Tickets and locate created ticket
    await page.getByRole("button", { name: /My Tickets/i }).click();
    const myTicketRow = page.locator("tbody tr", { hasText: ticketNumber });
    await expect(myTicketRow).toBeVisible();
    await myTicketRow.click();

    // Verify Requester Ticket Detail view
    await expect(page.getByTestId("ticket-detail-view")).toBeVisible();
    await expect(page.getByText(summaryText)).toBeVisible();

    // Verify Public Comment IS visible
    await expect(page.getByText(publicCommentText)).toBeVisible();

    // Verify Confidential Internal Note is STRICTLY NOT visible (Confidentiality check)
    await expect(page.getByText(internalNoteText)).toHaveCount(0);
    await expect(page.getByText(/Staff Eyes Only/i)).toHaveCount(0);

    // Capture Requester Detail view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-requester-ticket-detail-view.png"),
    });

    // Requester indicates problem resolved (FR-21 / BR-11)
    const indicateResolvedBtn = page.getByTestId("indicate-resolved-button");
    await expect(indicateResolvedBtn).toBeVisible();
    await indicateResolvedBtn.click();

    // Verify Resolution Indicated badge appears
    await expect(page.getByText("✅ Resolution Indicated")).toBeVisible();

    // Sign out Requester
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    // ──────────────────────────────────────────────────────────────────────────
    // Step 5: Staff sees resolution banner and formally closes ticket (Terminal state)
    // ──────────────────────────────────────────────────────────────────────────
    await page.fill("#login-email", "charlie.staff@toktick.local");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await page.fill("input[placeholder*='Search ticket']", ticketNumber);
    await page.waitForTimeout(500);

    const staffRow = page.locator("tbody tr", { hasText: ticketNumber });
    await staffRow.getByRole("button", { name: /Open Detail/i }).click();

    // Verify prominent requester indication banner
    await expect(page.getByText(/Requester Indication: The requester indicated this issue appears resolved/i)).toBeVisible();

    // Transition to Resolved
    await page.selectOption("#staff-status-select", "Resolved");
    await page.getByRole("button", { name: /Update Status/i }).click();
    await expect(page.getByText(/Status transitioned to Resolved/i)).toBeVisible();

    // Transition to Closed (Terminal State)
    await page.selectOption("#staff-status-select", "Closed");
    await page.getByRole("button", { name: /Update Status/i }).click();
    await expect(page.getByText(/Status transitioned to Closed/i)).toBeVisible();

    // Verify Terminal State warning & badge
    await expect(page.getByText(/Ticket is in terminal state \(Closed\)\. No further transitions allowed\./i)).toBeVisible();
    await expect(page.locator(".badge-status-closed")).toBeVisible();

    // Capture Closed Ticket Terminal State
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05-staff-closed-ticket-terminal.png"),
    });
  });

  test("TC-E2E-STAFF-02: multi-viewport responsiveness and zero horizontal overflow across queue and detail", async ({
    page,
  }) => {
    // Sign in as IT Staff
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/");
    await page.fill("#login-email", "charlie.staff@toktick.local");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();
    await expect(page.locator(".user-name")).toHaveText("Charlie Staff");

    // 1. Desktop (1200px) — Queue
    await page.setViewportSize({ width: 1200, height: 800 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-staff-queue-desktop.png"),
    });

    // 2. Tablet (800px) — Queue & Detail
    await page.setViewportSize({ width: 800, height: 1024 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-staff-queue-tablet.png"),
    });

    // Open first ticket for detail responsiveness check
    await page.locator("tbody tr").first().getByRole("button", { name: /Open Detail/i }).click();
    await expect(page.locator(".staff-ticket-detail")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07-staff-ticket-detail-tablet.png"),
    });

    // 3. Mobile (375px) — Detail & Queue
    await page.setViewportSize({ width: 375, height: 812 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "09-staff-ticket-detail-mobile.png"),
    });

    // Back to queue on mobile
    await page.getByRole("button", { name: /Back to Ticket Queue/i }).click();
    await expect(page.getByTestId("staff-ticket-cards")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "08-staff-queue-mobile.png"),
    });
  });
});
