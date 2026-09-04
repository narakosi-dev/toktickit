import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "artifacts/lab-02/screenshots");

test.describe("Automated Screenshot Capture for Lab 2 Report", () => {
  test.beforeAll(() => {
    fs.mkdirSync(path.join(SCREENSHOT_DIR, "create-ticket"), { recursive: true });
    fs.mkdirSync(path.join(SCREENSHOT_DIR, "my-tickets"), { recursive: true });
    fs.mkdirSync(path.join(SCREENSHOT_DIR, "ticket-detail"), { recursive: true });
    fs.mkdirSync(path.join(SCREENSHOT_DIR, "responsive"), { recursive: true });
  });

  test("Capture all evidence screenshots across workflows and viewports", async ({ page }) => {
    // ----------------------------------------------------
    // PART 5 & 6: Development Requester & Create Ticket
    // ----------------------------------------------------
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto("http://localhost:5173");

    // Select "Nara Kosiyaporn"
    await expect(page.getByText("Select Development Requester")).toBeVisible();
    await page.selectOption("#requester-select", { label: "Nara Kosiyaporn (nara.kosi@kmutt.ac.th)" });

    // 01: Dev Requester Selector Screen
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "create-ticket/01-dev-requester-select.png"),
    });

    await page.getByRole("button", { name: /Continue/i }).click();

    // Verify inside portal
    await expect(page.getByText("Nara Kosiyaporn")).toBeVisible();

    // Navigate to Create Ticket
    await page.getByRole("button", { name: /Create Ticket/i }).click();
    await expect(page.getByText("Create IT Support Ticket")).toBeVisible();

    // 02: Initial Create Ticket Screen (Desktop Viewport)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "create-ticket/02-create-ticket-initial-desktop.png"),
    });

    // 03: Validation Errors State (Submit empty form)
    await page.getByRole("button", { name: /Submit Ticket/i }).click();
    await expect(page.getByText("Category is required")).toBeVisible();
    await expect(page.getByText("Summary is required")).toBeVisible();
    await expect(page.getByText("Description is required")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "create-ticket/03-create-ticket-validation-errors.png"),
    });

    // 04: Fill form inputs
    await page.selectOption("#category", { index: 1 });
    await page.selectOption("#relatedSystem", { index: 1 });
    await page.selectOption("#priority", "High");
    await page.fill("#summary", "MacBook Pro M3 battery drains abnormally fast");
    await page.fill(
      "#description",
      "Battery drops from 100% to 15% in less than 45 minutes while running basic development applications. Needs battery diagnostics or replacement."
    );

    // 05: Simulate API Failure (AC-06: Form preservation)
    await page.route("**/api/tickets", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Database Connection Timeout" }),
        });
      } else {
        route.continue();
      }
    });

    await page.getByRole("button", { name: /Submit Ticket/i }).click();
    await expect(page.getByText("Internal Database Connection Timeout")).toBeVisible();
    // Form values still preserved
    expect(await page.locator("#summary").inputValue()).toBe("MacBook Pro M3 battery drains abnormally fast");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "create-ticket/04-create-ticket-api-failure-preserved.png"),
    });

    // Unroute 500 mock and submit real ticket
    await page.unroute("**/api/tickets");
    await page.getByRole("button", { name: /Submit Ticket/i }).click();

    // 06: Ticket Created Success Dialog with Official Number
    await expect(page.getByText(/Ticket Created Successfully/i)).toBeVisible();
    const ticketNumberElement = page.getByTestId("created-ticket-number");
    const ticketNumber = ((await ticketNumberElement.textContent()) || "").trim();
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "create-ticket/05-create-ticket-success-official-number.png"),
    });

    // ----------------------------------------------------
    // PART 7: My Tickets Screen & Search/Filter/Sort
    // ----------------------------------------------------
    await page.getByRole("button", { name: /View My Tickets/i }).click();
    await expect(page.getByRole("heading", { name: /My Tickets/i })).toBeVisible();
    await expect(page.getByText(ticketNumber).first()).toBeVisible();

    // 07: My Tickets for Requester A (Jennifer Anderson)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "my-tickets/06-my-tickets-requester-a.png"),
    });

    // 08: Filter by Category
    await page.getByTestId("filter-category-select").selectOption({ index: 1 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "my-tickets/07-my-tickets-filter-category.png"),
    });

    // Reset filter
    await page.getByTestId("filter-category-select").selectOption({ index: 0 });

    // 09: Filter by Priority (High)
    await page.getByTestId("filter-priority-select").selectOption("High");
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "my-tickets/08-my-tickets-filter-priority.png"),
    });

    // Reset priority
    await page.getByTestId("filter-priority-select").selectOption("");

    // 10: Search for keyword
    await page.getByTestId("search-tickets-input").fill("MacBook");
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "my-tickets/09-my-tickets-search.png"),
    });

    // 11: No-Results Search State
    await page.getByTestId("search-tickets-input").fill("non_existent_xyz_9999");
    await page.waitForTimeout(400);
    await expect(page.getByText(/No matching tickets found/i)).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "my-tickets/10-my-tickets-no-results-state.png"),
    });

    // Clear filters
    await page.getByTestId("clear-filters-btn").click();
    await page.waitForTimeout(300);

    // ----------------------------------------------------
    // PART 8: Ticket Detail & Attachments Lifecycle
    // ----------------------------------------------------
    // Click ticket row to open detail
    await page.getByText(ticketNumber).first().click();
    await expect(page.getByTestId("ticket-detail-view")).toBeVisible();

    // 12: Ticket Detail View
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "ticket-detail/11-ticket-detail-view.png"),
    });

    // 13: Upload an invalid attachment (.txt file) to demonstrate validation
    const invalidFilePath = path.join(SCREENSHOT_DIR, "temp-invalid.txt");
    fs.writeFileSync(invalidFilePath, "This is an unsupported plain text file.");
    await page.locator('input[type="file"]').setInputFiles(invalidFilePath);
    await expect(page.getByText("Unsupported file type. Permitted: JPG, PNG, WEBP, PDF.")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "ticket-detail/12-ticket-detail-invalid-attachment.png"),
    });
    fs.unlinkSync(invalidFilePath);

    // 14: Upload a valid PNG screenshot
    const validFilePath = path.join(SCREENSHOT_DIR, "diagnostic-screenshot.png");
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    fs.writeFileSync(validFilePath, pngBuffer);
    await page.locator('input[type="file"]').setInputFiles(validFilePath);
    await expect(page.getByText("diagnostic-screenshot.png")).toBeVisible();
    await expect(page.getByText("1 / 5 active attachments")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "ticket-detail/13-ticket-detail-valid-attachment-uploaded.png"),
    });
    fs.unlinkSync(validFilePath);

    // 15: Soft Removal Modal
    await page.getByRole("button", { name: /Remove/i }).click();
    await expect(page.getByText("Remove Attachment")).toBeVisible();
    await page.locator("#removal-reason-input").fill("Replaced by updated diagnostic screenshot");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "ticket-detail/14-ticket-detail-soft-remove-modal.png"),
    });

    // Confirm removal
    await page.getByRole("button", { name: "Confirm Removal" }).click();
    await expect(page.getByText("Removed", { exact: true })).toBeVisible();
    await expect(page.getByText(/Replaced by updated diagnostic screenshot/i)).toBeVisible();

    // 16: Soft Removed State (Download disabled, audit reason shown)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "ticket-detail/15-ticket-detail-soft-removed-state.png"),
    });

    // ----------------------------------------------------
    // PART 7 (Continued): Data Isolation (Switch to Requester B)
    // ----------------------------------------------------
    await page.getByRole("button", { name: /Change Requester/i }).click();
    await expect(page.getByText("Select Development Requester")).toBeVisible();
    await page.selectOption("#requester-select", { label: "Sunny farmhouse (nara2012sun@gmail.com)" });
    await page.getByRole("button", { name: /Continue/i }).click();

    await expect(page.getByText("Sunny farmhouse")).toBeVisible();
    await page.getByRole("button", { name: /My Tickets/i }).click();
    await expect(page.getByText("Loading your tickets...")).not.toBeVisible();
    await page.waitForTimeout(400);

    // Nara's ticket is strictly NOT visible
    await expect(page.getByText(ticketNumber)).toHaveCount(0);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "my-tickets/16-my-tickets-requester-b-isolation.png"),
    });

    // Switch back to Nara Kosiyaporn for responsive screenshots
    await page.getByRole("button", { name: /Change Requester/i }).click();
    await page.selectOption("#requester-select", { label: "Nara Kosiyaporn (nara.kosi@kmutt.ac.th)" });
    await page.getByRole("button", { name: /Continue/i }).click();

    // ----------------------------------------------------
    // PART 9: Responsive Viewports Evidence (Zen Green)
    // ----------------------------------------------------
    // Desktop (1200px)
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.getByRole("button", { name: /Create Ticket/i }).click();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "responsive/17-responsive-desktop-1200px.png"),
    });

    // Tablet (800px)
    await page.setViewportSize({ width: 800, height: 1024 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "responsive/18-responsive-tablet-800px.png"),
    });

    // Mobile (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "responsive/19-responsive-mobile-375px.png"),
    });

    // Mobile My Tickets
    await page.getByRole("button", { name: /My Tickets/i }).click();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "responsive/20-responsive-mobile-my-tickets-375px.png"),
    });
  });
});
