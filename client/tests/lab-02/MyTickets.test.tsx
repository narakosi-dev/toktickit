import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import MyTickets from "../../src/components/MyTickets.js";
import * as api from "../../src/api.js";

// Mock the API module
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    fetchTickets: vi.fn(),
    fetchCategories: vi.fn(),
  };
});

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
];

const mockTicketsResponse: api.TicketListResponse = {
  tickets: [
    {
      id: 1,
      ticketNumber: "TKT-2026-000001",
      ticketDate: "2026-09-04T12:00:00.000Z",
      summary: "Cannot connect to office Wi-Fi",
      priority: "High",
      status: "New",
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 7, name: "Corporate Laptop" },
      attachmentCount: 2,
      description: "Sample description",
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 7,
      createdAt: "2026-09-04T12:00:00.000Z",
      updatedAt: "2026-09-04T12:00:00.000Z",
    },
    {
      id: 2,
      ticketNumber: "TKT-2026-000002",
      ticketDate: "2026-09-04T14:00:00.000Z",
      summary: "Password reset for CRM account",
      priority: "Low",
      status: "Resolved",
      category: { id: 1, name: "Account and Access" },
      relatedSystem: { id: 1, name: "Email" },
      attachmentCount: 0,
      description: "Sample description",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      createdAt: "2026-09-04T14:00:00.000Z",
      updatedAt: "2026-09-04T14:00:00.000Z",
    },
  ],
  pagination: {
    page: 1,
    limit: 8,
    totalCount: 2,
    totalPages: 1,
  },
};

function renderWithRequester(props: { onNavigateToCreate?: () => void } = {}) {
  localStorage.setItem(
    "toktickit_selected_requester",
    JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", active: true })
  );

  return render(
    <RequesterProvider>
      <MyTickets {...props} />
    </RequesterProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  (api.fetchCategories as ReturnType<typeof vi.fn>).mockResolvedValue(mockCategories);
});

describe("MyTickets Component (UI-06)", () => {
  // UI-06: Renders tickets table with ticket number, summary, category, badges, and attachment indicator
  it("UI-06: renders ticket list with ticket number, summary, badges, and attachment indicator", async () => {
    (api.fetchTickets as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicketsResponse);

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Cannot connect to office Wi-Fi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TKT-2026-000002").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Password reset for CRM account").length).toBeGreaterThan(0);

    // Verify badges
    expect(screen.getAllByText("High").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Resolved").length).toBeGreaterThan(0);

    // Verify attachment indicator
    expect(screen.getByText("📎 2")).toBeInTheDocument();
  });

  it("UI-06: displays empty state when user has no tickets at all", async () => {
    (api.fetchTickets as ReturnType<typeof vi.fn>).mockResolvedValue({
      tickets: [],
      pagination: { page: 1, limit: 8, totalCount: 0, totalPages: 0 },
    });

    const onNavigateToCreate = vi.fn();
    renderWithRequester({ onNavigateToCreate });

    await waitFor(() => {
      expect(screen.getByTestId("empty-tickets-view")).toBeInTheDocument();
    });

    expect(screen.getByText("No Tickets Yet")).toBeInTheDocument();
    expect(
      screen.getByText("You haven't submitted any IT support tickets yet. Need help with hardware, software, or account access?")
    ).toBeInTheDocument();

    // Click create ticket CTA
    fireEvent.click(screen.getByText("+ Create Your First Ticket"));
    expect(onNavigateToCreate).toHaveBeenCalledTimes(1);
  });

  it("UI-06: displays no-results state with clear filters option when search returns 0 tickets", async () => {
    // Initial fetch returns tickets
    (api.fetchTickets as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicketsResponse);

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0);
    });

    // Mock search returning 0 results
    (api.fetchTickets as ReturnType<typeof vi.fn>).mockResolvedValue({
      tickets: [],
      pagination: { page: 1, limit: 8, totalCount: 0, totalPages: 0 },
    });

    const searchInput = screen.getByTestId("search-tickets-input");
    fireEvent.change(searchInput, { target: { value: "NonExistentTerm" } });

    await waitFor(() => {
      expect(screen.getByTestId("no-results-view")).toBeInTheDocument();
    });

    expect(screen.getByText("No Matching Tickets Found")).toBeInTheDocument();

    // Click Reset Filters
    fireEvent.click(screen.getByText("Reset Filters"));
    expect(searchInput).toHaveValue("");
  });

  it("UI-06: updates query parameters when changing search and filter options", async () => {
    (api.fetchTickets as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicketsResponse);

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0);
    });

    // Change category filter
    const categorySelect = screen.getByTestId("filter-category-select");
    fireEvent.change(categorySelect, { target: { value: "2" } });

    await waitFor(() => {
      expect(api.fetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterId: 1,
          categoryId: "2",
        })
      );
    });

    // Change priority filter
    const prioritySelect = screen.getByTestId("filter-priority-select");
    fireEvent.change(prioritySelect, { target: { value: "Critical" } });

    await waitFor(() => {
      expect(api.fetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterId: 1,
          priority: "Critical",
        })
      );
    });
  });

  it("UI-06: navigates pagination controls properly", async () => {
    (api.fetchTickets as ReturnType<typeof vi.fn>).mockResolvedValue({
      tickets: mockTicketsResponse.tickets,
      pagination: { page: 1, limit: 2, totalCount: 4, totalPages: 2 },
    });

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    const prevBtn = screen.getByTestId("pagination-prev");
    const nextBtn = screen.getByTestId("pagination-next");

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Click Next
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(api.fetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });
});
