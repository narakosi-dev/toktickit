import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AppShell from "../../src/components/AppShell.js";
import { AuthContext } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return {
    ...actual,
    fetchStaffDashboard: vi.fn(),
    fetchRequesterDashboard: vi.fn(),
    fetchStaffTickets: vi.fn(),
    fetchTickets: vi.fn(),
    fetchCategories: vi.fn().mockResolvedValue([]),
    checkSystem: vi.fn().mockResolvedValue({ status: "ok", categories: [] }),
  };
});

const mockStaffUser = {
  id: 10,
  name: "Alex Staff",
  email: "alex.staff@example.com",
  role: "IT_Staff",
  mustChangePassword: false,
};

const mockRequesterUser = {
  id: 20,
  name: "Sam Requester",
  email: "sam.requester@example.com",
  role: "Requester",
  mustChangePassword: false,
};

const mockStaffDashboardData: api.StaffDashboardResponse = {
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
  urgentTickets: [],
  recentUpdatedTickets: [],
  generatedAt: new Date().toISOString(),
};

const mockRequesterDashboardData: api.RequesterDashboardResponse = {
  metrics: {
    totalOpen: 3,
    inProgress: 1,
    waitingForRequester: 1,
    recentlyResolved: 2,
    closed: 5,
    closedCount: 5,
  },
  recentTickets: [],
  generatedAt: new Date().toISOString(),
};

function renderStaffAppShell() {
  const authValue: any = {
    user: mockStaffUser,
    token: "valid-staff-token",
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <AppShell />
    </AuthContext.Provider>
  );
}

function renderRequesterAppShell() {
  localStorage.setItem(
    "toktickit_selected_requester",
    JSON.stringify({ id: 20, name: "Sam Requester", email: "sam.requester@example.com", department: "Finance" })
  );

  const authValue: any = {
    user: mockRequesterUser,
    token: "valid-requester-token",
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <RequesterProvider>
        <AppShell />
      </RequesterProvider>
    </AuthContext.Provider>
  );
}

describe("Dashboard Drill-down Integration Tests (Issue #58 / Review Feedback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue(mockStaffDashboardData);
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(mockRequesterDashboardData);
    vi.mocked(api.fetchStaffTickets).mockResolvedValue({
      tickets: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    vi.mocked(api.fetchTickets).mockResolvedValue({
      tickets: [],
      pagination: { page: 1, limit: 8, totalCount: 0, totalPages: 1 },
    });
  });

  it("Staff drill-down: clicks 'Waiting for Requester' card and opens StaffTicketQueue with status=Waiting_for_Requester", async () => {
    renderStaffAppShell();

    // 1. Navigate to Dashboard tab
    const dashNav = screen.getByTestId("nav-dashboard");
    fireEvent.click(dashNav);

    // 2. Wait for StaffDashboard to render metric cards
    await waitFor(() => {
      expect(screen.getByTestId("metric-card-waiting")).toBeInTheDocument();
    });

    vi.mocked(api.fetchStaffTickets).mockClear();

    // 3. Click Waiting for Requester metric card
    fireEvent.click(screen.getByTestId("metric-card-waiting"));

    // 4. Verify StaffTicketQueue mounted and fetchStaffTickets called with status=Waiting_for_Requester
    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        "valid-staff-token",
        expect.objectContaining({
          status: "Waiting_for_Requester",
        })
      );
    });
  });

  it("Staff drill-down: clicks 'My Assigned' card and opens StaffTicketQueue with assigneeId=mine and status=active", async () => {
    renderStaffAppShell();

    // 1. Navigate to Dashboard tab
    const dashNav = screen.getByTestId("nav-dashboard");
    fireEvent.click(dashNav);

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-my-assigned")).toBeInTheDocument();
    });

    vi.mocked(api.fetchStaffTickets).mockClear();

    // 2. Click My Assigned metric card
    fireEvent.click(screen.getByTestId("metric-card-my-assigned"));

    // 3. Verify fetchStaffTickets called with assigneeId=mine and status=active
    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        "valid-staff-token",
        expect.objectContaining({
          assigneeId: "mine",
          status: "active",
        })
      );
    });
  });

  it("Staff navigation: clicking top navbar Ticket Queue resets drill-down filters", async () => {
    renderStaffAppShell();

    // 1. Drill down from waiting card first
    fireEvent.click(screen.getByTestId("nav-dashboard"));
    await waitFor(() => expect(screen.getByTestId("metric-card-waiting")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("metric-card-waiting"));

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        "valid-staff-token",
        expect.objectContaining({ status: "Waiting_for_Requester" })
      );
    });

    vi.mocked(api.fetchStaffTickets).mockClear();

    // 2. Click top navbar "Ticket Queue"
    const queueNavBtn = screen.getByRole("button", { name: /Ticket Queue/i });
    fireEvent.click(queueNavBtn);

    // 3. Verify filter was cleared (status and assigneeId undefined)
    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        "valid-staff-token",
        expect.objectContaining({
          status: undefined,
          assigneeId: undefined,
        })
      );
    });
  });

  it("Requester drill-down: clicks 'My Open Tickets' card and opens MyTickets with status=open", async () => {
    renderRequesterAppShell();

    // 1. Navigate to Dashboard tab
    const dashNav = screen.getByTestId("nav-dashboard");
    fireEvent.click(dashNav);

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-open")).toBeInTheDocument();
    });

    vi.mocked(api.fetchTickets).mockClear();

    // 2. Click My Open Tickets card
    fireEvent.click(screen.getByTestId("metric-card-open"));

    // 3. Verify MyTickets mounted and fetchTickets called with status=open
    await waitFor(() => {
      expect(api.fetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterId: 20,
          status: "open",
        })
      );
    });
  });

  it("Requester drill-down: clicks 'In Progress' card and opens MyTickets with status=In_Progress", async () => {
    renderRequesterAppShell();

    // 1. Navigate to Dashboard tab
    const dashNav = screen.getByTestId("nav-dashboard");
    fireEvent.click(dashNav);

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-in-progress")).toBeInTheDocument();
    });

    vi.mocked(api.fetchTickets).mockClear();

    // 2. Click In Progress card
    fireEvent.click(screen.getByTestId("metric-card-in-progress"));

    // 3. Verify MyTickets mounted and fetchTickets called with status=In_Progress
    await waitFor(() => {
      expect(api.fetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterId: 20,
          status: "In_Progress",
        })
      );
    });
  });

  it("Requester navigation: clicking top navbar My Tickets resets drill-down filters", async () => {
    renderRequesterAppShell();

    // 1. Drill down from in progress card first
    fireEvent.click(screen.getByTestId("nav-dashboard"));
    await waitFor(() => expect(screen.getByTestId("metric-card-in-progress")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("metric-card-in-progress"));

    await waitFor(() => {
      expect(api.fetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({ status: "In_Progress" })
      );
    });

    vi.mocked(api.fetchTickets).mockClear();

    // 2. Click top navbar "My Tickets"
    const myTicketsNavBtn = screen.getByRole("button", { name: /My Tickets/i });
    fireEvent.click(myTicketsNavBtn);

    // 3. Verify filter is reset (status is undefined or empty)
    await waitFor(() => {
      expect(api.fetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          status: undefined,
        })
      );
    });
  });
});
