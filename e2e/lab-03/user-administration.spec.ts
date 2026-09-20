import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "artifacts/lab-03/screenshots/user-admin");

async function assertNoHorizontalOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe("Sprint 3 (Lab 3) E2E: Administrator User Management (Issue #35)", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Sign in as Administrator
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/");
    await expect(page.getByText(/IT Service Desk — Sign In/i)).toBeVisible();

    await page.fill("#login-email", "admin@toktick.local");
    await page.fill("#login-password", "Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator(".user-name")).toHaveText("Alice Admin");
    await expect(page.locator(".user-role-badge")).toHaveText("Admin");

    // Navigate to User Management
    await page.getByRole("button", { name: /User Management/i }).click();
    await expect(page.getByRole("heading", { name: /User Management/i })).toBeVisible();
  });

  test("TC-E2E-ADMIN-01: Admin user directory viewing, search, and role filtering", async ({
    page,
  }) => {
    // 1. Verify User Directory table rendered with seeded users
    await expect(page.locator("tbody tr")).not.toHaveCount(0);
    await expect(page.locator("tbody tr", { hasText: "Alice Admin" })).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Charlie Staff" })).toBeVisible();

    // Capture initial directory screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-admin-directory-desktop.png"),
    });

    // 2. Test search by name/email
    await page.fill("[data-testid='search-input']", "Charlie");
    await page.getByTestId("search-btn").click();
    await expect(page.locator("tbody tr", { hasText: "Charlie Staff" })).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Alice Admin" })).toHaveCount(0);

    // 3. Test filter by role
    await page.fill("[data-testid='search-input']", "");
    await page.selectOption("[data-testid='role-filter']", "Administrator");
    await expect(page.locator("tbody tr", { hasText: "Alice Admin" })).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Charlie Staff" })).toHaveCount(0);

    // Capture search and filter results
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-admin-search-filter-desktop.png"),
    });

    // Reset filter
    await page.selectOption("[data-testid='role-filter']", "All");
    await expect(page.locator("tbody tr", { hasText: "Charlie Staff" })).toBeVisible();
  });

  test("TC-E2E-ADMIN-02: User creation with temporary password generation and clipboard copy", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const uniqueUserEmail = `e2e.staff.${Date.now()}@toktick.local`;
    const uniqueUserName = `E2E Staff Member ${Date.now() % 1000}`;

    // Click Add User
    await page.getByTestId("add-user-btn").click();
    await expect(page.getByRole("heading", { name: /Add New User/i })).toBeVisible();

    // Fill new user details
    const form = page.locator("[data-testid='create-user-form']");
    await form.locator("input[aria-label='Full Name']").fill(uniqueUserName);
    await form.locator("input[aria-label='Email Address']").fill(uniqueUserEmail);
    await form.locator("select[aria-label='Role']").selectOption("IT_Staff");

    // Capture Add User Modal Form
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-add-user-modal-form.png"),
    });

    // Submit Create User
    await page.getByTestId("submit-create-user-btn").click();

    // Verify Success View with generated temporary password
    await expect(page.getByText(/User Account Created!/i)).toBeVisible();
    await expect(page.getByText(/Temporary Initial Password:/i)).toBeVisible();
    await expect(page.getByText(/required to change this password/i)).toBeVisible();

    // Capture Success View
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-add-user-success-temp-password.png"),
    });

    // Test Copy button
    await page.getByRole("button", { name: /Copy/i }).click();
    await expect(page.getByText(/copied to clipboard/i)).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: /Done/i }).click();

    // Verify newly created user is visible in directory table
    await page.fill("[data-testid='search-input']", uniqueUserEmail);
    await page.getByTestId("search-btn").click();
    const newRow = page.locator("tbody tr", { hasText: uniqueUserEmail });
    await expect(newRow).toBeVisible();
    await expect(newRow.getByText("IT Staff")).toBeVisible();
    await expect(newRow.getByText(/Must Change/i)).toBeVisible();
  });

  test("TC-E2E-ADMIN-03: Safety invariants enforcement (BR-13 self-deactivation and BR-14 last admin)", async ({
    page,
  }) => {
    // 1. Self-Deactivation Prevention (BR-13)
    // Locate row for logged-in Administrator (Alice Admin)
    const selfRow = page.locator("tbody tr", { hasText: "Alice Admin" });
    await expect(selfRow).toBeVisible();
    await selfRow.getByRole("button", { name: /Edit/i }).click();

    // Verify Edit User Modal loads
    await expect(page.getByRole("heading", { name: /Edit User: Alice Admin/i })).toBeVisible();

    // Verify active switch is disabled
    const activeToggle = page.getByTestId("edit-user-active");
    expect(await activeToggle.isDisabled()).toBe(true);

    // Verify warning text explaining self-deactivation restriction
    await expect(page.getByText(/You cannot deactivate your own account/i)).toBeVisible();

    // Capture screenshot of self-deactivation invariant
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05-safety-invariant-self-deactivation-disabled.png"),
    });

    // Cancel edit
    await page.getByRole("button", { name: /Cancel/i }).click();
    await expect(page.getByRole("heading", { name: /Edit User: Alice Admin/i })).toHaveCount(0);
  });

  test("TC-E2E-ADMIN-04: Password reset provisioning (BR-02)", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Locate Charlie Staff row
    const targetRow = page.locator("tbody tr", { hasText: "Charlie Staff" });
    await expect(targetRow).toBeVisible();

    // Click Reset Password
    await targetRow.getByRole("button", { name: /Reset Password/i }).click();

    // Verify Reset Password modal opens
    await expect(page.getByRole("heading", { name: /Reset Password: Charlie Staff/i })).toBeVisible();
    await expect(page.getByText(/This action will invalidate the user's current credentials/i)).toBeVisible();

    // Confirm password reset
    await page.locator("[data-testid='reset-password-form'] button[type='submit']").click();

    // Verify Success View with new temporary password
    await expect(page.getByText(/Password Reset Successful/i)).toBeVisible();
    await expect(page.getByText(/New Temporary Password Issued/i)).toBeVisible();

    // Capture Password Reset Success Modal
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-password-reset-success-modal.png"),
    });

    // Copy to clipboard
    await page.getByRole("button", { name: /Copy/i }).click();
    await expect(page.getByText(/copied to clipboard/i)).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: /Done/i }).click();

    // Verify Charlie Staff row now indicates "Must Change"
    await expect(targetRow.getByText(/Must Change/i)).toBeVisible();
  });

  test("TC-E2E-ADMIN-05: Multi-viewport responsiveness and zero horizontal overflow (Desktop, Tablet, Mobile)", async ({
    page,
  }) => {
    // 1. Desktop (1200px)
    await page.setViewportSize({ width: 1200, height: 800 });
    await assertNoHorizontalOverflow(page);

    // 2. Tablet (800px)
    await page.setViewportSize({ width: 800, height: 1024 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07-admin-directory-tablet.png"),
    });

    // 3. Mobile (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await assertNoHorizontalOverflow(page);
    await expect(page.getByTestId("users-cards-mobile")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "08-admin-directory-mobile.png"),
    });
  });
});
