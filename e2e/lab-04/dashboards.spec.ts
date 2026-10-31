import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "artifacts/lab-04/screenshots/dashboards");

async function assertNoHorizontalOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe("Sprint 4 (Lab 4) E2E: Role-Based Dashboards & Multi-Viewport Responsiveness (Issue #59)", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("E2E-DSH-01: IT Staff Dashboard renders 5 metric cards, urgent feed, and filtered queue drill-down across Desktop, Tablet, and Mobile", async ({
    page,
  }) => {
    // ──────────────────────────────────────────────────────────────────────────
    // Step 1: IT Staff sign-in and navigation to Dashboard
    // ──────────────────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    await page.fill("#login-email", "bob.smith@example.com");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Bob Smith");
    await expect(page.locator(".user-role-badge")).toHaveText("IT Staff");

    // Click Dashboard in navbar
    const navDashboardBtn = page.getByTestId("nav-dashboard");
    await expect(navDashboardBtn).toBeVisible();
    await navDashboardBtn.click();

    // Verify 5 Staff Metric Cards
    await expect(page.getByTestId("metric-card-unassigned")).toBeVisible();
    await expect(page.getByTestId("metric-card-open")).toBeVisible();
    await expect(page.getByTestId("metric-card-in-progress")).toBeVisible();
    await expect(page.getByTestId("metric-card-waiting")).toBeVisible();
    await expect(page.getByTestId("metric-card-my-assigned")).toBeVisible();

    // Verify Operational Highlights and tabs
    await expect(page.getByRole("heading", { name: /Operational Highlights/i })).toBeVisible();
    await expect(page.getByTestId("tab-urgent")).toBeVisible();

    // ──────────────────────────────────────────────────────────────────────────
    // Step 2: Multi-viewport responsiveness & zero overflow check
    // ──────────────────────────────────────────────────────────────────────────
    // 1. Desktop (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-staff-dashboard-desktop.png"),
    });

    // 2. Tablet (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-staff-dashboard-tablet.png"),
    });

    // 3. Mobile (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-staff-dashboard-mobile.png"),
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Step 3: Drill-down navigation to filtered queue
    // ──────────────────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1280, height: 800 });

    // Drill-down 1: Waiting for Requester metric card
    await page.getByTestId("metric-card-waiting").click();
    await expect(page.getByRole("heading", { name: /IT Support Queue/i })).toBeVisible();
    await expect(page.locator("#filter-status")).toHaveValue("Waiting_for_Requester");

    // Return to dashboard
    await page.getByTestId("nav-dashboard").click();
    await expect(page.getByTestId("metric-card-my-assigned")).toBeVisible();

    // Drill-down 2: My Assigned metric card
    await page.getByTestId("metric-card-my-assigned").click();
    await expect(page.getByRole("heading", { name: /IT Support Queue/i })).toBeVisible();
    await expect(page.locator("#filter-assignee")).toHaveValue("mine");
  });

  test("E2E-DSH-02: Requester Dashboard renders 4 metric cards, recent requests, and filtered My Tickets drill-down across Desktop, Tablet, and Mobile", async ({
    page,
  }) => {
    // ──────────────────────────────────────────────────────────────────────────
    // Step 1: Requester sign-in and navigation to Dashboard
    // ──────────────────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await page.fill("#login-email", "nara.kosi@kmutt.ac.th");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Nara Kosiyaporn");
    await expect(page.locator(".user-role-badge")).toHaveText("Requester");

    // Click Dashboard in navbar
    const navDashboardBtn = page.getByTestId("nav-dashboard");
    await expect(navDashboardBtn).toBeVisible();
    await navDashboardBtn.click();

    // Verify 4 Requester Metric Cards
    await expect(page.getByTestId("metric-card-open")).toBeVisible();
    await expect(page.getByTestId("metric-card-in-progress")).toBeVisible();
    await expect(page.getByTestId("metric-card-resolved")).toBeVisible();
    await expect(page.getByTestId("metric-card-closed")).toBeVisible();

    // Verify Quick Actions
    await expect(page.getByRole("heading", { name: /Quick Actions/i })).toBeVisible();

    // ──────────────────────────────────────────────────────────────────────────
    // Step 2: Multi-viewport responsiveness & zero overflow check
    // ──────────────────────────────────────────────────────────────────────────
    // 1. Desktop (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-requester-dashboard-desktop.png"),
    });

    // 2. Tablet (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05-requester-dashboard-tablet.png"),
    });

    // 3. Mobile (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-requester-dashboard-mobile.png"),
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Step 3: Drill-down navigation to My Tickets with filter applied
    // ──────────────────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1280, height: 800 });

    // Drill-down 1: Open tickets card (navigates with OPEN_GROUP)
    await page.getByTestId("metric-card-open").click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByTestId("filter-status-select")).toHaveValue("OPEN_GROUP");

    // Return to dashboard
    await page.getByTestId("nav-dashboard").click();
    await expect(page.getByTestId("metric-card-resolved")).toBeVisible();

    // Drill-down 2: Resolved tickets card (navigates with Resolved)
    await page.getByTestId("metric-card-resolved").click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByTestId("filter-status-select")).toHaveValue("Resolved");
  });
});
