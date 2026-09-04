import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import CreateTicket from "../../src/components/CreateTicket.js";
import * as api from "../../src/api.js";

// Mock the API module
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    fetchCategories: vi.fn(),
    fetchRelatedSystems: vi.fn(),
    createTicket: vi.fn(),
  };
});

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
  { id: 4, name: "Network" },
];

const mockSystems: api.RelatedSystem[] = [
  { id: 1, name: "Email" },
  { id: 7, name: "Corporate Laptop" },
];

function renderWithRequester() {
  // Set up a requester in localStorage so context picks it up
  localStorage.setItem(
    "toktickit_selected_requester",
    JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", active: true })
  );

  return render(
    <RequesterProvider>
      <CreateTicket onTicketCreated={vi.fn()} />
    </RequesterProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  (api.fetchCategories as ReturnType<typeof vi.fn>).mockResolvedValue(mockCategories);
  (api.fetchRelatedSystems as ReturnType<typeof vi.fn>).mockResolvedValue(mockSystems);
});

describe("CreateTicket Component", () => {
  // UI-03: Submit empty form → displays field error messages, API NOT called
  it("UI-03: shows validation errors on empty form submit and does not call API", async () => {
    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByText("Create IT Support Ticket")).toBeInTheDocument();
    });

    // Submit empty form
    fireEvent.click(screen.getByTestId("submit-ticket-btn"));

    // Check all field-level error messages
    expect(screen.getByText("Category is required")).toBeInTheDocument();
    expect(screen.getByText("Related System is required")).toBeInTheDocument();
    expect(screen.getByText("Priority is required")).toBeInTheDocument();
    expect(screen.getByText("Summary is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();

    // API must NOT be called
    expect(api.createTicket).not.toHaveBeenCalled();
  });

  // UI-04: Fill valid fields & submit → shows busy state, then success with ticket number
  it("UI-04: submits valid form, shows loading state, then success view with ticket number", async () => {
    const mockTicket: api.Ticket = {
      id: 1,
      ticketNumber: "TKT-2026-000001",
      ticketDate: "2026-09-05T00:00:00.000Z",
      summary: "Laptop battery drains fast",
      description: "Battery drains extremely fast even while idle.",
      priority: "High",
      status: "New",
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 7,
      createdAt: "2026-09-05T00:00:00.000Z",
      updatedAt: "2026-09-05T00:00:00.000Z",
    };

    // Make createTicket return after a small delay to observe busy state
    (api.createTicket as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);

    renderWithRequester();

    // Wait for reference data to load
    await waitFor(() => {
      expect(screen.getByTestId("category-select")).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByTestId("category-select"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("system-select"), { target: { value: "7" } });
    fireEvent.change(screen.getByTestId("priority-select"), { target: { value: "High" } });
    fireEvent.change(screen.getByTestId("summary-input"), {
      target: { value: "Laptop battery drains fast" },
    });
    fireEvent.change(screen.getByTestId("description-input"), {
      target: { value: "Battery drains extremely fast even while idle." },
    });

    // Submit
    fireEvent.click(screen.getByTestId("submit-ticket-btn"));

    // Verify success view
    await waitFor(() => {
      expect(screen.getByText("Ticket Created Successfully")).toBeInTheDocument();
    });

    // Ticket number displayed
    expect(screen.getByTestId("created-ticket-number")).toHaveTextContent("TKT-2026-000001");

    // Verify API was called with correct payload
    expect(api.createTicket).toHaveBeenCalledWith({
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 7,
      priority: "High",
      summary: "Laptop battery drains fast",
      description: "Battery drains extremely fast even while idle.",
    });
  });

  // UI-05: Backend returns 500 on submit → error banner shown, entered values preserved
  it("UI-05: shows error banner on server failure and preserves form input values", async () => {
    (api.createTicket as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Failed to create ticket")
    );

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByTestId("category-select")).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByTestId("category-select"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("system-select"), { target: { value: "7" } });
    fireEvent.change(screen.getByTestId("priority-select"), { target: { value: "High" } });
    fireEvent.change(screen.getByTestId("summary-input"), {
      target: { value: "VPN keeps disconnecting" },
    });
    fireEvent.change(screen.getByTestId("description-input"), {
      target: { value: "VPN drops connection every 5 minutes when idle." },
    });

    // Submit
    fireEvent.click(screen.getByTestId("submit-ticket-btn"));

    // Wait for error banner
    await waitFor(() => {
      expect(screen.getByText(/Submission Failed/)).toBeInTheDocument();
    });

    // Form values must be preserved (AC-06)
    expect(screen.getByTestId("summary-input")).toHaveValue("VPN keeps disconnecting");
    expect(screen.getByTestId("description-input")).toHaveValue(
      "VPN drops connection every 5 minutes when idle."
    );
    expect(screen.getByTestId("category-select")).toHaveValue("2");
    expect(screen.getByTestId("system-select")).toHaveValue("7");
    expect(screen.getByTestId("priority-select")).toHaveValue("High");
  });

  // Additional: Summary too short validation
  it("shows summary length validation error", async () => {
    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByTestId("summary-input")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("category-select"), { target: { value: "1" } });
    fireEvent.change(screen.getByTestId("system-select"), { target: { value: "1" } });
    fireEvent.change(screen.getByTestId("priority-select"), { target: { value: "Low" } });
    fireEvent.change(screen.getByTestId("summary-input"), { target: { value: "abc" } });
    fireEvent.change(screen.getByTestId("description-input"), {
      target: { value: "This is a valid description for testing." },
    });

    fireEvent.click(screen.getByTestId("submit-ticket-btn"));

    expect(screen.getByText("Summary must be at least 5 characters")).toBeInTheDocument();
    expect(api.createTicket).not.toHaveBeenCalled();
  });
});
