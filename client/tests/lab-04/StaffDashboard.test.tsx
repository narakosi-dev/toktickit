import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import StaffDashboard from "../../src/components/StaffDashboard.js";
import { AuthContext } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return {
    ...actual,
    fetchStaffDashboard: vi.fn(),
  };
});

const mockStaffUser = {
  id: 8,
  name: "Charlie Staff",
  email: "charlie.staff@toktick.local",
  role: "IT_Staff",
  mustChangePassword: false,
};

const mockDashboardResponse: api.StaffDashboardResponse = {
  metrics: {
    unassignedCount: 4,
    myAssignedCount: 3,
    statusBreakdown: {
      New: 5,
      Open: 8,
      In_Progress: 12,
      Waiting_for_Requester: 4,
      Resolved: 15,
      Reopened: 2,
    },
    priorityBreakdown: {
      Critical: 3,
      High: 11,
      Medium: 18,
      Low: 7,
    },
  },
  urgentTickets: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Core router link failure in data center",
      priority: "Critical",
      itPriority: "Critical",
      status: "Open",
      requester: { id: 1, name: "Alice Requester" },
      assignedTo: null,
      createdAt: "2026-10-29T08:00:00.000Z",
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-000102",
      summary: "Production database replica out of sync",
      priority: "High",
      itPriority: "Critical",
      status: "In_Progress",
      requester: { id: 2, name: "Bob Engineer" },
      assignedTo: { id: 8, name: "Charlie Staff" },
      createdAt: "2026-10-29T09:00:00.000Z",
    },
  ],
  recentUpdatedTickets: [
    {
      id: 103,
      ticketNumber: "TKT-2026-000103",
      summary: "Keyboard replacement requested",
      priority: "Low",
      itPriority: null,
      status: "Waiting_for_Requester",
      requester: { id: 3, name: "David User" },
      assignedTo: { id: 8, name: "Charlie Staff" },
      updatedAt: "2026-10-30T10:00:00.000Z",
    },
  ],
  generatedAt: "2026-10-31T12:00:00.000Z",
};

function renderDashboard(props: Partial<React.ComponentProps<typeof StaffDashboard>> = {}) {
  const authValue: any = {
    user: mockStaffUser,
    token: "mock-valid-staff-token",
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <StaffDashboard {...props} />
    </AuthContext.Provider>
  );
}

describe("StaffDashboard Component (Lab 4 — Issue 10 / UI-DSH-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UI-DSH-01: renders 5 metric cards with correct numbers and personalized greeting", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockDashboardResponse);

    renderDashboard();

    // Check loading indicator first
    expect(screen.getByText(/Loading operational metrics/i)).toBeInTheDocument();

    // Wait for metrics to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Charlie Staff!/i)).toBeInTheDocument();
    });

    // 5 metric cards values:
    // New: 5, Open: 8, In Progress: 12, Waiting for Requester: 4, My Assigned: 3
    expect(screen.getByTestId("metric-card-new")).toHaveTextContent("5");
    expect(screen.getByTestId("metric-card-open")).toHaveTextContent("8");
    expect(screen.getByTestId("metric-card-in-progress")).toHaveTextContent("12");
    expect(screen.getByTestId("metric-card-waiting")).toHaveTextContent("4");
    expect(screen.getByTestId("metric-card-my-assigned")).toHaveTextContent("3");

    // Verify unassigned queue count is mentioned
    expect(screen.getByText(/4 unassigned in queue/i)).toBeInTheDocument();
  });

  it("UI-DSH-01: clicking metric cards triggers navigation to ticket queue with appropriate filters", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockDashboardResponse);
    const onNavigateToQueue = vi.fn();

    renderDashboard({ onNavigateToQueue });

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-new")).toBeInTheDocument();
    });

    // 1. Click New card
    fireEvent.click(screen.getByTestId("metric-card-new"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ status: "New" });

    // 2. Click Open card
    fireEvent.click(screen.getByTestId("metric-card-open"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ status: "Open" });

    // 3. Click In Progress card
    fireEvent.click(screen.getByTestId("metric-card-in-progress"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ status: "In_Progress" });

    // 4. Click Waiting Req card
    fireEvent.click(screen.getByTestId("metric-card-waiting"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ status: "Waiting_for_Requester" });

    // 5. Click My Assigned card
    fireEvent.click(screen.getByTestId("metric-card-my-assigned"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ assignee: "mine", status: "active" });
  });

  it("UI-DSH-01: renders urgent tickets and handles row click to select ticket", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockDashboardResponse);
    const onSelectTicket = vi.fn();

    renderDashboard({ onSelectTicket });

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    expect(screen.getByText("Core router link failure in data center")).toBeInTheDocument();
    expect(screen.getByText("Production database replica out of sync")).toBeInTheDocument();

    // Click first urgent ticket
    fireEvent.click(screen.getByTestId("urgent-ticket-101"));
    expect(onSelectTicket).toHaveBeenCalledWith(101);
  });

  it("UI-DSH-01: toggles between Urgent and Recent tickets view tabs", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockDashboardResponse);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("tab-recent")).toBeInTheDocument();
    });

    // Click Recent tab
    fireEvent.click(screen.getByTestId("tab-recent"));

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000103")).toBeInTheDocument();
      expect(screen.getByText("Keyboard replacement requested")).toBeInTheDocument();
    });
  });

  it("UI-DSH-01: triggers quick action buttons properly", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockDashboardResponse);
    const onNavigateToCreate = vi.fn();
    const onNavigateToQueue = vi.fn();

    renderDashboard({ onNavigateToCreate, onNavigateToQueue });

    await waitFor(() => {
      expect(screen.getByTestId("quick-action-create")).toBeInTheDocument();
    });

    // Click Create Ticket
    fireEvent.click(screen.getByTestId("quick-action-create"));
    expect(onNavigateToCreate).toHaveBeenCalledTimes(1);

    // Click My Queue
    fireEvent.click(screen.getByTestId("quick-action-my-queue"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ assignee: "mine", status: "active" });

    // Click All Tickets
    fireEvent.click(screen.getByTestId("quick-action-all-tickets"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ status: "All" });
  });

  it("displays error message and allows retry when API request fails", async () => {
    vi.mocked(api.fetchStaffDashboard)
      .mockRejectedValueOnce(new Error("Network connection error"))
      .mockResolvedValueOnce(mockDashboardResponse);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Network connection error/i)).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Charlie Staff!/i)).toBeInTheDocument();
    });
  });
});
