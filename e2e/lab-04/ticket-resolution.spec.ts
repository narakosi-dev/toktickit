import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "artifacts/lab-04/screenshots/resolution");

async function assertNoHorizontalOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe("Sprint 4 (Lab 4) E2E: Ticket Resolution & Advisory Workflow (Issue #59)", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("E2E-WKF-01: Requester indicates resolution, IT Staff observes advisory banner, documents Action Taken, and transitions to Resolved across viewports", async ({
    page,
  }) => {
    const summaryText = `[E2E-WKF-01] Intermittent VPN disconnects during videoconferencing ${Date.now()}`;
    const descriptionText =
      "Requester reports intermittent connection loss to KMUTT internal intranet every 15-20 minutes.";

    // ──────────────────────────────────────────────────────────────────────────
    // Step 1: Requester creates ticket and indicates resolution
    // ──────────────────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    await page.fill("#login-email", "nara.kosi@kmutt.ac.th");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Nara Kosiyaporn");

    // Create Ticket
    await page.getByRole("button", { name: /Create Ticket/i }).click();
    await page.selectOption("#category", { label: "Network" });
    await page.selectOption("#relatedSystem", { label: "VPN" });
    await page.selectOption("#priority", "Medium");
    await page.fill("#summary", summaryText);
    await page.fill("#description", descriptionText);

    await page.getByTestId("submit-ticket-btn").click();
    await expect(page.getByText(/Ticket Created Successfully/i)).toBeVisible();
    const ticketNumber = (await page.getByTestId("created-ticket-number").innerText()).trim();

    // Navigate to My Tickets via View My Tickets button on confirmation card
    await page.getByRole("button", { name: "View My Tickets" }).click();
    const myTicketRow = page.locator("tbody tr", { hasText: ticketNumber });
    await expect(myTicketRow).toBeVisible();
    await myTicketRow.click();

    // Requester signals problem resolution (FR-21 / BR-11)
    await expect(page.getByTestId("ticket-detail-view")).toBeVisible();
    const indicateResolvedBtn = page.getByTestId("indicate-resolved-button");
    await expect(indicateResolvedBtn).toBeVisible();
    await indicateResolvedBtn.click();

    // Verify Resolution Indicated badge appears
    await expect(page.getByText("✅ Resolution Indicated")).toBeVisible();

    // Capture Requester Resolution Indication screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-requester-indicated-resolved.png"),
    });

    // Sign out Requester
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    // ──────────────────────────────────────────────────────────────────────────
    // Step 2: IT Staff observes advisory banner, fulfills resolution invariant, and marks Resolved
    // ──────────────────────────────────────────────────────────────────────────
    await page.fill("#login-email", "bob.smith@example.com");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Bob Smith");

    // Locate ticket in queue
    await page.fill("input[placeholder*='Search ticket']", ticketNumber);
    await page.waitForTimeout(500);

    const staffRow = page.locator("tbody tr", { hasText: ticketNumber });
    await expect(staffRow).toBeVisible();
    await staffRow.getByRole("button", { name: /Open Detail/i }).click();

    // Verify Advisory Feedback Banner (UI-WKF-03 / AC-09)
    await expect(
      page.getByText(/Requester Indication: The requester indicated this issue appears resolved/i)
    ).toBeVisible();

    // Transition status New -> Open -> In_Progress
    await page.selectOption("#staff-status-select", "Open");
    await page.getByRole("button", { name: /Update Status/i }).click();
    await expect(page.getByText(/Status transitioned to Open/i)).toBeVisible();

    await page.selectOption("#staff-status-select", "In_Progress");
    await page.getByRole("button", { name: /Update Status/i }).click();
    await expect(page.getByText(/Status transitioned to In Progress/i)).toBeVisible();

    // Verify Resolution Invariant (AC-07): Warning shown when Resolved selected with 0 actions
    await page.selectOption("#staff-status-select", "Resolved");
    await expect(
      page.getByText(/At least 1 Action Taken is required before marking this ticket as Resolved/i)
    ).toBeVisible();

    // Document mandatory Action Taken (Lab 4 — Issue 6)
    await page.getByTestId("add-action-taken-btn").click();
    await page.fill(
      "#actionDescription",
      "Reconfigured VPN concentrator gateway MTU from 1500 to 1420 bytes and purged stale routing cache."
    );
    await page.fill(
      "#actionResult",
      "Packet fragmentation eliminated; packet loss dropped to 0.00% across all active VPN tunnels."
    );
    await page.getByRole("button", { name: /Save Action Taken/i }).click();

    // Verify Action Taken persisted
    await expect(page.getByText("Reconfigured VPN concentrator gateway MTU from 1500 to 1420 bytes and purged stale routing cache.")).toBeVisible();

    // Formally transition to Resolved
    await page.selectOption("#staff-status-select", "Resolved");
    await page.getByRole("button", { name: /Update Status/i }).click();
    await expect(page.getByText(/Status transitioned to Resolved/i)).toBeVisible();
    await expect(page.locator(".badge-status-resolved")).toBeVisible();

    // Capture Staff Ticket Resolved Desktop screenshot
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-staff-ticket-resolved-desktop.png"),
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Step 3: Multi-viewport responsiveness on Staff Resolution view
    // ──────────────────────────────────────────────────────────────────────────
    // Tablet (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-staff-resolution-tablet.png"),
    });

    // Mobile (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-staff-resolution-mobile.png"),
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Step 4: Requester verifies Resolved status across user sessions
    // ──────────────────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    await page.fill("#login-email", "nara.kosi@kmutt.ac.th");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await page.locator("header").getByRole("button", { name: /My Tickets/i }).click();
    const resolvedRow = page.locator("tbody tr", { hasText: ticketNumber });
    await expect(resolvedRow).toBeVisible();
    await expect(resolvedRow.locator(".badge-status-resolved")).toBeVisible();

    await resolvedRow.click();
    await expect(page.getByTestId("ticket-detail-view")).toBeVisible();
    await expect(page.locator(".badge-status-resolved")).toBeVisible();
    await expect(page.getByTestId("ticket-detail-view").getByText("Resolved").first()).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05-requester-ticket-resolved.png"),
    });
  });
});
