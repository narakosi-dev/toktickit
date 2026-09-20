import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/auth");

async function assertNoHorizontalOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe("Sprint 3 (Lab 3) E2E: Authentication & Access Control (Issue #35)", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("TC-E2E-AUTH-01: valid login for Requester, Staff, and Administrator with role-appropriate routing and badges", async ({
    page,
  }) => {
    // 1. Requester Login
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/");
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    await page.fill("#login-email", "nara.kosi@kmutt.ac.th");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // Verify Requester Dashboard
    await expect(page.locator(".user-name")).toHaveText("Nara Kosiyaporn");
    await expect(page.locator(".user-role-badge")).toHaveText("Requester");
    await expect(page.getByRole("button", { name: /My Tickets/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Ticket/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /User Management/i })).toHaveCount(0);

    // Sign out
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    // 2. IT Staff Login
    await page.fill("#login-email", "charlie.staff@toktick.local");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // Verify Staff Dashboard
    await expect(page.locator(".user-name")).toHaveText("Charlie Staff");
    await expect(page.locator(".user-role-badge")).toHaveText("IT Staff");
    await expect(page.getByRole("button", { name: /Ticket Queue/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /User Management/i })).toHaveCount(0);

    // Sign out
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    // 3. Administrator Login
    await page.fill("#login-email", "admin@toktick.local");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // Verify Administrator Dashboard
    await expect(page.locator(".user-name")).toHaveText("Alice Admin");
    await expect(page.locator(".user-role-badge")).toHaveText("Admin");
    await expect(page.getByRole("button", { name: /User Management/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ticket Queue/i })).toBeVisible();

    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();
  });

  test("TC-E2E-AUTH-02: mandatory password change flow on initial login (BR-02)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/");

    // Sign in with initial temporary password
    await page.fill("#login-email", "sarah.requester@toktick.local");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // Gated into Change Password Screen
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible();
    await expect(page.getByText(/You must change your initial password before continuing/i)).toBeVisible();

    // Capture Mandatory Change Password Screen
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-change-password-mandatory-screen.png"),
    });

    const submitBtn = page.getByRole("button", { name: /Change Password/i });
    expect(await submitBtn.isDisabled()).toBe(true);

    // Fill current password
    await page.fill("#current-password", "Password123!");

    // Test weak password fails complexity checklist
    await page.fill("#new-password", "weak");
    await page.fill("#confirm-password", "weak");
    expect(await submitBtn.isDisabled()).toBe(true);

    // Fill compliant strong new password
    const newSecurePass = "NewSecureP@ss2026!";
    await page.fill("#new-password", newSecurePass);
    await page.fill("#confirm-password", newSecurePass);

    // All rules should pass and button should be enabled
    expect(await submitBtn.isEnabled()).toBe(true);

    // Submit password update
    await submitBtn.click();

    // Seamless redirect to main AppShell
    await expect(page.locator(".user-name")).toHaveText("Sarah Johnson");
    await expect(page.getByRole("button", { name: /My Tickets/i })).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07-change-password-success-redirect.png"),
    });

    // Sign out and verify login with new password
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    await page.fill("#login-email", "sarah.requester@toktick.local");
    await page.fill("#login-password", newSecurePass);
    await page.getByRole("button", { name: /Sign In/i }).click();

    // Verify direct landing on AppShell without password prompt
    await expect(page.locator(".user-name")).toHaveText("Sarah Johnson");
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toHaveCount(0);
    await page.getByRole("button", { name: /Sign Out/i }).click();
  });

  test("TC-E2E-AUTH-03: invalid credentials display clear error without revealing account existence", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/");

    // 1. Wrong password
    await page.fill("#login-email", "nara.kosi@kmutt.ac.th");
    await page.fill("#login-password", "WrongPassword999!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-login-invalid-error.png"),
    });

    // 2. Non-existent email
    await page.fill("#login-email", "nonexistent.ghost@toktick.local");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();

    // 3. Client validation on empty submission
    await page.fill("#login-email", "");
    await page.fill("#login-password", "");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.getByText(/Please enter both email and password/i)).toBeVisible();
  });

  test("TC-E2E-AUTH-04: inactive account is blocked with deactivation notification (BR-01)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/");

    // Attempt login with deactivated user
    await page.fill("#login-email", "inactive.user@toktick.local");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(
      page.getByText(/Account has been deactivated\. Please contact IT Administrator\./i)
    ).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05-login-inactive-account-blocked.png"),
    });

    // Verify remains on login page
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();
    await expect(page.getByText("Inactive User")).toHaveCount(0);
  });

  test("TC-E2E-AUTH-05: multi-viewport responsiveness and zero horizontal overflow (Desktop, Tablet, Mobile)", async ({
    page,
  }) => {
    // 1. Desktop (1200px)
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/");
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-login-screen-desktop.png"),
    });

    // 2. Tablet (800px)
    await page.setViewportSize({ width: 800, height: 1024 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-login-screen-tablet.png"),
    });

    // 3. Mobile (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-login-screen-mobile.png"),
    });
  });
});
