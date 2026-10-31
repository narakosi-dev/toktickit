import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import RequesterDashboard from "../../src/components/RequesterDashboard.js";
import { AuthContext } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return {
    ...actual,
    fetchRequesterDashboard: vi.fn(),
  };
});

const mockRequesterUser = {
  id: 1,
  name: "Sarah Johnson",
  email: "sarah.requester@toktick.local",
  role: "Requester",
  mustChangePassword: false,
};

const mockRequesterDashboardResponse: api.RequesterDashboardResponse = {
  metrics: {
    totalOpen: 3,
    inProgress: 1,
    waitingForRequester: 1,
    recentlyResolved: 2,
    closed: 5,
    closedCount: 5,
  },
  recentTickets: [
    {
      id: 201,
      ticketNumber: "TKT-2026-000201",
      summary: "VPN connection drops every 10 minutes",
      priority: "High",
      status: "Waiting_for_Requester",
      resolvedIndicated: false,
      category: { id: 2, name: "Network" },
      updatedAt: "2026-10-30T09:45:00.000Z",
    },
    {
      id: 202,
      ticketNumber: "TKT-2026-000202",
      summary: "Laptop battery drains in less than 30 minutes",
      priority: "Medium",
      status: "In_Progress",
      resolvedIndicated: true,
      category: { id: 1, name: "Hardware" },
      updatedAt: "2026-10-30T08:30:00.000Z",
    },
  ],
  generatedAt: "2026-10-31T12:00:00.000Z",
};

function renderDashboard(props: Partial<React.ComponentProps<typeof RequesterDashboard>> = {}) {
  const authValue: any = {
    user: mockRequesterUser,
    token: "mock-valid-requester-token",
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <RequesterDashboard {...props} />
    </AuthContext.Provider>
  );
}

describe("RequesterDashboard Component (Lab 4 — Issue 10 / UI-DSH-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UI-DSH-02: renders personal metric cards with accurate counts and greeting banner", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValueOnce(mockRequesterDashboardResponse);

    renderDashboard();

    expect(screen.getByText(/Loading your ticket summary/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Sarah Johnson!/i)).toBeInTheDocument();
    });

    // 4 metric cards:
    // My Open: 3, In Progress: 1, Resolved: 2, Closed: 5
    expect(screen.getByTestId("metric-card-open")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-card-in-progress")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-card-resolved")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-card-closed")).toHaveTextContent("5");
  });

  it("UI-DSH-02: clicking metric cards triggers navigation to My Tickets with appropriate filters", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValueOnce(mockRequesterDashboardResponse);
    const onNavigateToMyTickets = vi.fn();

    renderDashboard({ onNavigateToMyTickets });

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-open")).toBeInTheDocument();
    });

    // Click My Open Tickets
    fireEvent.click(screen.getByTestId("metric-card-open"));
    expect(onNavigateToMyTickets).toHaveBeenCalledWith({ status: "OPEN_GROUP" });

    // Click In Progress
    fireEvent.click(screen.getByTestId("metric-card-in-progress"));
    expect(onNavigateToMyTickets).toHaveBeenCalledWith({ status: "In_Progress" });

    // Click Recently Resolved
    fireEvent.click(screen.getByTestId("metric-card-resolved"));
    expect(onNavigateToMyTickets).toHaveBeenCalledWith({ status: "Resolved" });

    // Click Closed
    fireEvent.click(screen.getByTestId("metric-card-closed"));
    expect(onNavigateToMyTickets).toHaveBeenCalledWith({ status: "Closed" });
  });

  it("UI-DSH-02: renders recent tickets with resolution indicator and handles selection", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValueOnce(mockRequesterDashboardResponse);
    const onSelectTicket = vi.fn();

    renderDashboard({ onSelectTicket });

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000201")).toBeInTheDocument();
    });

    expect(screen.getByText("VPN connection drops every 10 minutes")).toBeInTheDocument();
    expect(screen.getByText("Category: Network")).toBeInTheDocument();

    // Second ticket has resolvedIndicated = true
    expect(screen.getByText("✓ Resolution Indicated")).toBeInTheDocument();

    // Click on ticket row
    fireEvent.click(screen.getByTestId("requester-ticket-201"));
    expect(onSelectTicket).toHaveBeenCalledWith(201);
  });

  it("UI-DSH-02: triggers quick actions properly (create new ticket & view all tickets)", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValueOnce(mockRequesterDashboardResponse);
    const onNavigateToCreate = vi.fn();
    const onNavigateToMyTickets = vi.fn();

    renderDashboard({ onNavigateToCreate, onNavigateToMyTickets });

    await waitFor(() => {
      expect(screen.getByTestId("quick-action-create")).toBeInTheDocument();
    });

    // Click Create New Ticket
    fireEvent.click(screen.getByTestId("quick-action-create"));
    expect(onNavigateToCreate).toHaveBeenCalledTimes(1);

    // Click View All My Tickets
    fireEvent.click(screen.getByTestId("quick-action-view-tickets"));
    expect(onNavigateToMyTickets).toHaveBeenCalledTimes(1);
  });

  it("UI-DSH-02: displays clean empty state when requester has zero tickets", async () => {
    const emptyResponse: api.RequesterDashboardResponse = {
      metrics: {
        totalOpen: 0,
        inProgress: 0,
        waitingForRequester: 0,
        recentlyResolved: 0,
        closed: 0,
        closedCount: 0,
      },
      recentTickets: [],
      generatedAt: "2026-10-31T12:00:00.000Z",
    };

    vi.mocked(api.fetchRequesterDashboard).mockResolvedValueOnce(emptyResponse);
    const onNavigateToCreate = vi.fn();

    renderDashboard({ onNavigateToCreate });

    await waitFor(() => {
      expect(screen.getByTestId("empty-recent-tickets")).toBeInTheDocument();
    });

    expect(screen.getByText(/No support tickets yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create your first ticket/i })).toBeInTheDocument();

    // Click create first ticket
    fireEvent.click(screen.getByRole("button", { name: /Create your first ticket/i }));
    expect(onNavigateToCreate).toHaveBeenCalledTimes(1);
  });

  it("displays error message and allows retry when API fails", async () => {
    vi.mocked(api.fetchRequesterDashboard)
      .mockRejectedValueOnce(new Error("Unable to connect to dashboard API"))
      .mockResolvedValueOnce(mockRequesterDashboardResponse);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Unable to connect to dashboard API/i)).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Sarah Johnson!/i)).toBeInTheDocument();
    });
  });
});
