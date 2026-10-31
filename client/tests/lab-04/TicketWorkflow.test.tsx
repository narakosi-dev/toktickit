import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import StaffTicketDetail from "../../src/components/StaffTicketDetail.js";
import { AuthContext } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

// Mock API functions
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return {
    ...actual,
    fetchStaffTicketDetail: vi.fn(),
    fetchStaffMembers: vi.fn(),
    assignTicket: vi.fn(),
    updateTicketPriority: vi.fn(),
    updateTicketStatus: vi.fn(),
    createPublicComment: vi.fn(),
    createInternalNote: vi.fn(),
    fetchActionsTaken: vi.fn(),
  };
});

const mockStaffMembers: api.StaffMember[] = [
  { id: 2, name: "Michael Brown", email: "michael.brown@toktickit.com", role: "IT_Staff" },
  { id: 3, name: "Sarah Connor", email: "sarah.connor@toktickit.com", role: "IT_Staff" },
];

const mockBaseTicket: api.StaffTicketDetailData = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  ticketDate: "2026-09-19T01:00:00.000Z",
  summary: "VPN connection drops frequently",
  description: "Staff cannot connect to corporate VPN reliably.",
  priority: "High",
  itPriority: "High",
  status: "New",
  version: 2,
  requesterId: 5,
  requester: { id: 5, name: "Alice Requester", email: "alice@example.com" },
  ownerId: 2,
  assignedTo: { id: 2, name: "Michael Brown", email: "michael.brown@toktickit.com" },
  owner: { id: 2, name: "Michael Brown", email: "michael.brown@toktickit.com" },
  category: { id: 1, name: "Network" },
  relatedSystem: { id: 1, name: "VPN Gateway" },
  attachments: [],
  publicComments: [],
  internalNotes: [],
  resolvedIndicated: false,
  resolvedByRequester: false,
  createdAt: "2026-09-19T01:00:00.000Z",
  updatedAt: "2026-09-19T01:20:00.000Z",
};

const mockAuthValue = {
  user: {
    id: 2,
    name: "Michael Brown",
    email: "michael.brown@toktickit.com",
    role: "IT_Staff",
    mustChangePassword: false,
  },
  token: "mock-jwt-staff-token",
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
  refreshProfile: vi.fn(),
};

function renderStaffTicketDetail(props: { ticketId?: number; onBack?: () => void } = {}) {
  return render(
    <AuthContext.Provider value={mockAuthValue}>
      <StaffTicketDetail ticketId={props.ticketId ?? 101} onBack={props.onBack ?? vi.fn()} />
    </AuthContext.Provider>
  );
}

describe("Ticket Status Workflow & Resolution Controls (Lab 4 — Issue 7 / UI-WKF)", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    (api.fetchStaffMembers as any).mockResolvedValue(mockStaffMembers);
    (api.fetchActionsTaken as any).mockResolvedValue({
      ticketId: 101,
      ticketNumber: "TKT-2026-000101",
      totalActions: 1,
      actionsTaken: [
        {
          id: 1,
          ticketId: 101,
          performedById: 2,
          performedBy: { id: 2, name: "Michael Brown", role: "IT_Staff" },
          actionDateTime: "2026-10-29T08:30:00.000Z",
          description: "Diagnosed VPN concentrator routing tables.",
          result: "Identified route flapping on tunnel interface.",
          followUpRequired: false,
        },
      ],
    });
  });

  // ==========================================
  // UI-WKF-01: Permitted Transitions Matrix
  // ==========================================
  describe("UI-WKF-01: Status Transition Controls & BR-06 Matrix", () => {
    it("displays strictly permitted transitions for status 'New' (Open, Cancelled)", async () => {
      (api.fetchStaffTicketDetail as any).mockResolvedValue({
        ...mockBaseTicket,
        status: "New",
      });

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(screen.getByLabelText(/Transition Status/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/Transition Status/i) as HTMLSelectElement;
      const optionValues = Array.from(select.options).map((o) => o.value);
      const optionTexts = Array.from(select.options).map((o) => o.text);

      expect(optionValues).toEqual(["", "Open", "Cancelled"]);
      expect(optionTexts).toEqual(["-- Select next status --", "Open", "Cancelled"]);

      // Illegal jumps must not be available
      expect(optionValues).not.toContain("Resolved");
      expect(optionValues).not.toContain("In_Progress");
      expect(optionValues).not.toContain("Closed");
    });

    it("displays strictly permitted transitions for status 'Open'", async () => {
      (api.fetchStaffTicketDetail as any).mockResolvedValue({
        ...mockBaseTicket,
        status: "Open",
      });

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(screen.getByLabelText(/Transition Status/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/Transition Status/i) as HTMLSelectElement;
      const optionValues = Array.from(select.options).map((o) => o.value);

      expect(optionValues).toEqual([
        "",
        "In_Progress",
        "Waiting_for_Requester",
        "Resolved",
        "Cancelled",
      ]);
      expect(optionValues).not.toContain("New");
      expect(optionValues).not.toContain("Closed");
    });

    it("displays strictly permitted transitions for status 'In_Progress' (Waiting, Resolved, Open)", async () => {
      (api.fetchStaffTicketDetail as any).mockResolvedValue({
        ...mockBaseTicket,
        status: "In_Progress",
      });

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(screen.getByLabelText(/Transition Status/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/Transition Status/i) as HTMLSelectElement;
      const optionValues = Array.from(select.options).map((o) => o.value);

      expect(optionValues).toEqual([
        "",
        "Waiting_for_Requester",
        "Resolved",
        "Open",
      ]);
      expect(optionValues).not.toContain("Cancelled");
      expect(optionValues).not.toContain("Closed");
    });

    it("displays strictly permitted transitions for status 'Resolved' (Closed, Reopened)", async () => {
      (api.fetchStaffTicketDetail as any).mockResolvedValue({
        ...mockBaseTicket,
        status: "Resolved",
      });

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(screen.getByLabelText(/Transition Status/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/Transition Status/i) as HTMLSelectElement;
      const optionValues = Array.from(select.options).map((o) => o.value);

      expect(optionValues).toEqual(["", "Closed", "Reopened"]);
      expect(optionValues).not.toContain("In_Progress");
      expect(optionValues).not.toContain("Open");
    });

    it("displays terminal state message and disables transitions for 'Closed' and 'Cancelled'", async () => {
      (api.fetchStaffTicketDetail as any).mockResolvedValue({
        ...mockBaseTicket,
        status: "Closed",
      });

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(
          screen.getByText(/Ticket is in terminal state \(Closed\)\. No further transitions allowed\./i)
        ).toBeInTheDocument();
      });

      // Status select must not exist in DOM for terminal states
      expect(screen.queryByLabelText(/Transition Status/i)).not.toBeInTheDocument();
    });

    it("dispatches updateTicketStatus with current version upon selecting permitted status", async () => {
      (api.fetchStaffTicketDetail as any).mockResolvedValue({
        ...mockBaseTicket,
        status: "New",
        version: 4,
      });
      (api.updateTicketStatus as any).mockResolvedValue({
        id: 101,
        status: "Open",
        version: 5,
      });

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(screen.getByLabelText(/Transition Status/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/Transition Status/i);
      await user.selectOptions(select, "Open");

      const updateBtn = screen.getByRole("button", { name: /Update Status/i });
      expect(updateBtn).not.toBeDisabled();
      await user.click(updateBtn);

      await waitFor(() => {
        expect(api.updateTicketStatus).toHaveBeenCalledWith(
          "mock-jwt-staff-token",
          101,
          "Open",
          4
        );
      });
    });
  });

  // ==========================================
  // UI-WKF-02: Concurrency Conflict Dialog (HTTP 409)
  // ==========================================
  describe("UI-WKF-02: Concurrency Conflict Alert & Recovery (AC-08 / BR-08)", () => {
    it("opens concurrency conflict dialog when server returns 409 Conflict", async () => {
      (api.fetchStaffTicketDetail as any).mockResolvedValue({
        ...mockBaseTicket,
        status: "Open",
        version: 2,
      });

      const conflictErr: any = new Error("Conflict: Ticket was modified concurrently by another user");
      conflictErr.status = 409;
      conflictErr.code = "CONCURRENCY_CONFLICT";
      (api.updateTicketStatus as any).mockRejectedValue(conflictErr);

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(screen.getByLabelText(/Transition Status/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/Transition Status/i);
      await user.selectOptions(select, "In_Progress");
      await user.click(screen.getByRole("button", { name: /Update Status/i }));

      // Concurrency Conflict Modal must be displayed
      expect(
        await screen.findByRole("dialog", { name: /Ticket Updated Concurrently/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Another technician modified this ticket while you were working/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Refresh Ticket/i })
      ).toBeInTheDocument();
    });

    it("re-fetches latest ticket state and closes conflict dialog when clicking 'Refresh Ticket'", async () => {
      (api.fetchStaffTicketDetail as any)
        .mockResolvedValueOnce({
          ...mockBaseTicket,
          status: "Open",
          version: 2,
        })
        .mockResolvedValueOnce({
          ...mockBaseTicket,
          status: "In_Progress",
          version: 3,
        });

      const conflictErr: any = new Error("Concurrency conflict");
      conflictErr.status = 409;
      conflictErr.code = "CONCURRENCY_CONFLICT";
      (api.updateTicketStatus as any).mockRejectedValue(conflictErr);

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(screen.getByLabelText(/Transition Status/i)).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByLabelText(/Transition Status/i), "Resolved");
      await user.click(screen.getByRole("button", { name: /Update Status/i }));

      const refreshBtn = await screen.findByRole("button", { name: /Refresh Ticket/i });
      await user.click(refreshBtn);

      // Re-fetches ticket detail to load updated state
      await waitFor(() => {
        expect(api.fetchStaffTicketDetail).toHaveBeenCalledTimes(2);
      });

      // Dialog is closed
      expect(
        screen.queryByRole("dialog", { name: /Ticket Updated Concurrently/i })
      ).not.toBeInTheDocument();
    });

    it("closes concurrency conflict dialog when user presses Escape key", async () => {
      (api.fetchStaffTicketDetail as any).mockResolvedValue({
        ...mockBaseTicket,
        status: "Open",
        version: 2,
      });

      const conflictErr: any = new Error("Concurrency conflict");
      conflictErr.status = 409;
      conflictErr.code = "CONCURRENCY_CONFLICT";
      (api.updateTicketStatus as any).mockRejectedValue(conflictErr);

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(screen.getByLabelText(/Transition Status/i)).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByLabelText(/Transition Status/i), "In_Progress");
      await user.click(screen.getByRole("button", { name: /Update Status/i }));

      expect(
        await screen.findByRole("dialog", { name: /Ticket Updated Concurrently/i })
      ).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });

      expect(
        screen.queryByRole("dialog", { name: /Ticket Updated Concurrently/i })
      ).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // UI-WKF-03: Advisory Resolution Banner
  // ==========================================
  describe("UI-WKF-03: Advisory Resolution Feedback Banner (AC-09 / BR-07)", () => {
    it("displays prominent advisory banner when ticket has resolvedIndicated = true", async () => {
      (api.fetchStaffTicketDetail as any).mockResolvedValue({
        ...mockBaseTicket,
        status: "In_Progress",
        resolvedIndicated: true,
      });

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(screen.getByText(/Requester Feedback:/i)).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          /The requester indicated this issue appears resolved\. Please verify the Actions Taken and formally set the status to/i
        )
      ).toBeInTheDocument();
    });

    it("does not display advisory banner when ticket has resolvedIndicated = false", async () => {
      (api.fetchStaffTicketDetail as any).mockResolvedValue({
        ...mockBaseTicket,
        status: "In_Progress",
        resolvedIndicated: false,
      });

      renderStaffTicketDetail();

      await waitFor(() => {
        expect(screen.getByLabelText(/Transition Status/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/Requester Feedback:/i)).not.toBeInTheDocument();
    });
  });
});
