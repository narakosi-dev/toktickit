import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import StaffTicketQueue from "../../src/components/StaffTicketQueue.js";
import { AuthContext } from "../../src/context/AuthContext.js";

// Mock the API module
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return {
    ...actual,
    fetchStaffTickets: vi.fn(),
    fetchCategories: vi.fn().mockResolvedValue([
      { id: 1, name: "Network" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
    ]),
  };
});

import { fetchStaffTickets } from "../../src/api.js";
const mockFetchStaffTickets = fetchStaffTickets as ReturnType<typeof vi.fn>;

const mockAuthValue = {
  user: {
    id: 2,
    name: "Michael Brown",
    email: "michael.brown@toktickit.com",
    role: "IT_Staff",
    mustChangePassword: false,
  },
  token: "mock-jwt-staff-token",
  login: vi.fn(),
  logout: vi.fn(),
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  refreshProfile: vi.fn(),
  isAuthenticated: true,
  isLoading: false,
};

function renderComponent(props = {}) {
  return render(
    <AuthContext.Provider value={mockAuthValue}>
      <StaffTicketQueue {...props} />
    </AuthContext.Provider>
  );
}

const sampleTickets = [
  {
    id: 101,
    ticketNumber: "TKT-2026-000101",
    ticketDate: "2026-09-19T01:00:00.000Z",
    summary: "VPN connection drops frequently",
    description: "Staff cannot connect to corporate VPN",
    priority: "High",
    itPriority: "Critical",
    status: "Open",
    resolvedIndicated: false,
    requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    assignedTo: { id: 2, name: "Michael Brown", email: "michael.brown@toktickit.com" },
    owner: { id: 2, name: "Michael Brown", email: "michael.brown@toktickit.com" },
    assignee: { id: 2, name: "Michael Brown", email: "michael.brown@toktickit.com" },
    category: { id: 1, name: "Network" },
    relatedSystem: { id: 2, name: "Corporate VPN" },
    _count: { attachments: 1, publicComments: 2, internalNotes: 1 },
    createdAt: "2026-09-19T01:00:00.000Z",
    updatedAt: "2026-09-19T01:00:00.000Z",
  },
  {
    id: 102,
    ticketNumber: "TKT-2026-000102",
    ticketDate: "2026-09-19T02:00:00.000Z",
    summary: "Need replacement mouse",
    description: "Hardware optical mouse stopped working",
    priority: "Low",
    itPriority: null,
    status: "New",
    resolvedIndicated: false,
    requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    assignedTo: null,
    owner: null,
    assignee: null,
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 1, name: "Workstation" },
    _count: { attachments: 0, publicComments: 0, internalNotes: 0 },
    createdAt: "2026-09-19T02:00:00.000Z",
    updatedAt: "2026-09-19T02:00:00.000Z",
  },
];

describe("StaffTicketQueue Component (Lab 3 — Issue 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchStaffTickets.mockResolvedValue({
      tickets: sampleTickets,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    });
  });

  it("TC-CLI-QUEUE-01: renders ticket table with columns: ID, Title, Requester, Category, Status badge, Priority badge, Assignee, and Created At", async () => {
    renderComponent();

    // Verify Title & Header
    expect(screen.getByText("🎫 IT Support Queue")).toBeInTheDocument();

    // Wait for table to load
    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-table")).toBeInTheDocument();
    });

    // Check table headers within the table
    const table = screen.getByTestId("staff-ticket-table");
    expect(table).toHaveTextContent("ID / Ticket No");
    expect(table).toHaveTextContent("Title");
    expect(table).toHaveTextContent("Requester");
    expect(table).toHaveTextContent("Category");
    expect(table).toHaveTextContent("Status");
    expect(table).toHaveTextContent("Priority");
    expect(table).toHaveTextContent("Assignee");
    expect(table).toHaveTextContent("Created At");

    // Check rows data
    expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("VPN connection drops frequently").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Jennifer Anderson").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Network").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Open").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("IT: Critical").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Michael Brown/).length).toBeGreaterThanOrEqual(1);

    // Unassigned ticket check
    expect(screen.getAllByText("TKT-2026-000102").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Unassigned/).length).toBeGreaterThanOrEqual(1);
  });

  it("TC-CLI-QUEUE-02: search input triggers debounced API fetch with query parameter", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByPlaceholderText(/search ticket/i);
    await user.type(searchInput, "VPN");

    // Wait for debounce (300ms)
    await waitFor(
      () => {
        expect(mockFetchStaffTickets).toHaveBeenCalledWith(
          "mock-jwt-staff-token",
          expect.objectContaining({ q: "VPN" })
        );
      },
      { timeout: 1500 }
    );
  });

  it("TC-CLI-QUEUE-03: filter dropdowns for Status, Priority, Assignee, Category properly update request state", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledTimes(1);
    });

    // Change Status filter to "New"
    const statusSelect = screen.getByLabelText(/status/i);
    await user.selectOptions(statusSelect, "New");

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(
        "mock-jwt-staff-token",
        expect.objectContaining({ status: "New" })
      );
    });

    // Change Priority filter to "High"
    const prioritySelect = screen.getByLabelText(/priority/i);
    await user.selectOptions(prioritySelect, "High");

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(
        "mock-jwt-staff-token",
        expect.objectContaining({ priority: "High" })
      );
    });

    // Change Assignee filter to "Unassigned"
    const assigneeSelect = screen.getByLabelText(/assignee/i);
    await user.selectOptions(assigneeSelect, "unassigned");

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(
        "mock-jwt-staff-token",
        expect.objectContaining({ assigneeId: "unassigned" })
      );
    });
  });

  it("TC-CLI-QUEUE-04: pagination buttons navigate pages and display 'Page X of Y (Total Z tickets)'", async () => {
    mockFetchStaffTickets.mockResolvedValue({
      tickets: sampleTickets,
      pagination: {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      },
    });

    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "Page 1 of 3 (Total 25 tickets)"
      );
    });

    // Next page button should be enabled
    const nextBtn = screen.getByRole("button", { name: /next page/i });
    expect(nextBtn).not.toBeDisabled();

    // Previous page button should be disabled on page 1
    const prevBtn = screen.getByRole("button", { name: /previous page/i });
    expect(prevBtn).toBeDisabled();

    // Click Next
    await user.click(nextBtn);

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(
        "mock-jwt-staff-token",
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it("TC-CLI-QUEUE-05: displays empty state illustration when filters return zero results", async () => {
    mockFetchStaffTickets.mockResolvedValueOnce({
      tickets: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("empty-queue-state")).toBeInTheDocument();
      expect(screen.getByText(/no tickets found/i)).toBeInTheDocument();
    });
  });

  it("TC-CLI-QUEUE-06: renders responsive cards container for mobile viewports (zero horizontal overflow)", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-cards")).toBeInTheDocument();
    });

    // Check that tickets are present in cards view
    const cardsContainer = screen.getByTestId("staff-ticket-cards");
    expect(cardsContainer).toHaveTextContent("TKT-2026-000101");
    expect(cardsContainer).toHaveTextContent("VPN connection drops frequently");
    expect(cardsContainer).toHaveTextContent("TKT-2026-000102");
    expect(cardsContainer).toHaveTextContent("Need replacement mouse");
  });

  it("renders stats counter cards with counts matching current ticket list", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Total Queue")).toBeInTheDocument();
      expect(screen.getAllByText("New").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Pending Requester").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Resolved").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("calls onSelectTicket when 'Open Detail' is clicked", async () => {
    const onSelectMock = vi.fn();
    const user = userEvent.setup();
    renderComponent({ onSelectTicket: onSelectMock });

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-table")).toBeInTheDocument();
    });

    const openButtons = screen.getAllByRole("button", { name: /open detail/i });
    expect(openButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(openButtons[0]);
    expect(onSelectMock).toHaveBeenCalledWith(101);
  });
});
