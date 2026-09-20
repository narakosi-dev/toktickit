import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import StaffTicketDetail from "../../src/components/StaffTicketDetail.js";
import TicketDetail from "../../src/components/TicketDetail.js";
import { AuthContext } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
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
    fetchTicketDetail: vi.fn(),
    indicateProblemResolved: vi.fn(),
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
  requesterId: 5,
  requester: { id: 5, name: "Alice Requester", email: "alice@example.com" },
  ownerId: null,
  assignedTo: null,
  owner: null,
  category: { id: 1, name: "Network" },
  relatedSystem: { id: 1, name: "VPN Gateway" },
  attachments: [
    {
      id: 501,
      originalName: "vpn-debug.log",
      sizeBytes: 1024,
      mimeType: "text/plain",
      active: true,
      createdAt: "2026-09-19T01:10:00.000Z",
    },
  ],
  publicComments: [
    {
      id: 1,
      ticketId: 101,
      userId: 5,
      content: "Hello, my VPN is dropping every 5 minutes.",
      createdAt: "2026-09-19T01:15:00.000Z",
      author: { id: 5, name: "Alice Requester", role: "Requester" },
    },
  ],
  internalNotes: [
    {
      id: 1,
      ticketId: 101,
      userId: 2,
      content: "Gateway switch port flapping, opened Cisco case #999.",
      createdAt: "2026-09-19T01:20:00.000Z",
      author: { id: 2, name: "Michael Brown", role: "IT_Staff" },
    },
  ],
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

describe("StaffTicketDetail Component (Lab 3 — Issue 9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchStaffMembers as any).mockResolvedValue(mockStaffMembers);
  });

  it("TC-CLI-DETAIL-01: renders ticket metadata header, requester card, operational panel and public comments", async () => {
    (api.fetchStaffTicketDetail as any).mockResolvedValue(mockBaseTicket);

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    expect(screen.getByText("VPN connection drops frequently")).toBeInTheDocument();
    expect(screen.getAllByText("Alice Requester").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Staff Operations")).toBeInTheDocument();
    expect(screen.getByText("vpn-debug.log")).toBeInTheDocument();
    expect(screen.getByText(/Hello, my VPN is dropping every 5 minutes/)).toBeInTheDocument();
  });

  it("TC-CLI-DETAIL-02: displays 'Claim Ticket' button when unassigned, claims ticket on click", async () => {
    (api.fetchStaffTicketDetail as any).mockResolvedValue(mockBaseTicket);
    (api.assignTicket as any).mockResolvedValue({ success: true });

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Claim Ticket" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Claim Ticket" }));

    await waitFor(() => {
      expect(api.assignTicket).toHaveBeenCalledWith("mock-jwt-staff-token", 101, 2);
    });

    expect(await screen.findByText(/Ticket claimed successfully/i)).toBeInTheDocument();
  });

  it("TC-CLI-DETAIL-03: status dropdown enforces BR-13 transition matrix (New -> Assigned, Open, In_Progress, Cancelled)", async () => {
    (api.fetchStaffTicketDetail as any).mockResolvedValue(mockBaseTicket);
    (api.updateTicketStatus as any).mockResolvedValue({ success: true });

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByLabelText(/Transition Status/i)).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/Transition Status/i) as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map((opt) => opt.value);

    // Permitted next states from 'New': Assigned, Open, In_Progress, Cancelled
    expect(options).toContain("Assigned");
    expect(options).toContain("Open");
    expect(options).toContain("In_Progress");
    expect(options).toContain("Cancelled");
    // Invalid next states from 'New' per BR-13:
    expect(options).not.toContain("Closed");
    expect(options).not.toContain("Pending_Requester");

    // Select In_Progress and update
    fireEvent.change(statusSelect, { target: { value: "In_Progress" } });
    const updateButton = screen.getByRole("button", { name: "Update Status" });
    expect(updateButton).not.toBeDisabled();

    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateTicketStatus).toHaveBeenCalledWith("mock-jwt-staff-token", 101, "In_Progress");
    });
  });

  it("TC-CLI-DETAIL-04: IT Priority selector allows changing priority and calls updateTicketPriority", async () => {
    (api.fetchStaffTicketDetail as any).mockResolvedValue(mockBaseTicket);
    (api.updateTicketPriority as any).mockResolvedValue({ success: true });

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByLabelText(/IT Priority Override/i)).toBeInTheDocument();
    });

    const prioritySelect = screen.getByLabelText(/IT Priority Override/i) as HTMLSelectElement;
    fireEvent.change(prioritySelect, { target: { value: "Critical" } });

    const priorityButton = screen.getByRole("button", { name: "Set Priority" });
    expect(priorityButton).not.toBeDisabled();

    fireEvent.click(priorityButton);

    await waitFor(() => {
      expect(api.updateTicketPriority).toHaveBeenCalledWith("mock-jwt-staff-token", 101, "Critical");
    });
  });

  it("TC-CLI-DETAIL-05: Reassign dropdown displays staff members and updates assignee", async () => {
    (api.fetchStaffTicketDetail as any).mockResolvedValue({
      ...mockBaseTicket,
      assignedTo: mockStaffMembers[0],
      owner: mockStaffMembers[0],
    });
    (api.assignTicket as any).mockResolvedValue({ success: true });

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByLabelText(/Assigned Staff Member/i)).toBeInTheDocument();
    });

    const reassignSelect = screen.getByLabelText(/Assigned Staff Member/i) as HTMLSelectElement;
    expect(reassignSelect).toHaveValue("2");

    // Select Sarah Connor (ID 3)
    fireEvent.change(reassignSelect, { target: { value: "3" } });
    const reassignButton = screen.getByRole("button", { name: "Reassign" });

    fireEvent.click(reassignButton);

    await waitFor(() => {
      expect(api.assignTicket).toHaveBeenCalledWith("mock-jwt-staff-token", 101, 3);
    });
  });

  it("TC-CLI-DETAIL-06: tab switcher toggles to Internal Notes with amber warning banner", async () => {
    const user = userEvent.setup();
    (api.fetchStaffTicketDetail as any).mockResolvedValue(mockBaseTicket);
    (api.createInternalNote as any).mockResolvedValue({
      id: 2,
      ticketId: 101,
      userId: 2,
      content: "Investigating routing table on core router.",
      createdAt: "2026-09-19T01:30:00.000Z",
      author: { id: 2, name: "Michael Brown", role: "IT_Staff" },
    });

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Internal Notes/i })).toBeInTheDocument();
    });

    // Click Internal Notes tab
    await user.click(screen.getByRole("tab", { name: /Internal Notes/i }));

    // Verify amber confidential banner
    expect(screen.getByText("Staff Eyes Only")).toBeInTheDocument();
    expect(screen.getByText(/Internal Notes are confidential and visible strictly to IT Staff/i)).toBeInTheDocument();
    expect(screen.getByText(/Gateway switch port flapping, opened Cisco case #999/)).toBeInTheDocument();

    // Type and submit a new internal note
    const noteInput = screen.getByLabelText(/Add a Confidential Internal Note/i);
    await user.type(noteInput, "Investigating routing table on core router.");

    const saveNoteBtn = screen.getByRole("button", { name: "Save Internal Note" });
    await user.click(saveNoteBtn);

    await waitFor(() => {
      expect(api.createInternalNote).toHaveBeenCalledWith(
        "mock-jwt-staff-token",
        101,
        "Investigating routing table on core router."
      );
    });

    expect(screen.getByText("Investigating routing table on core router.")).toBeInTheDocument();
  });

  it("TC-CLI-DETAIL-07: submits public comment and adds it to timeline", async () => {
    const user = userEvent.setup();
    (api.fetchStaffTicketDetail as any).mockResolvedValue(mockBaseTicket);
    (api.createPublicComment as any).mockResolvedValue({
      id: 2,
      ticketId: 101,
      userId: 2,
      content: "We have dispatched a network engineer to inspect the link.",
      createdAt: "2026-09-19T01:25:00.000Z",
      author: { id: 2, name: "Michael Brown", role: "IT_Staff" },
    });

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByLabelText(/Add a Public Comment/i)).toBeInTheDocument();
    });

    const commentInput = screen.getByLabelText(/Add a Public Comment/i);
    await user.type(commentInput, "We have dispatched a network engineer to inspect the link.");

    const submitCommentBtn = screen.getByRole("button", { name: "Post Public Comment" });
    await user.click(submitCommentBtn);

    await waitFor(() => {
      expect(api.createPublicComment).toHaveBeenCalledWith(
        "mock-jwt-staff-token",
        101,
        "We have dispatched a network engineer to inspect the link."
      );
    });

    expect(
      screen.getByText("We have dispatched a network engineer to inspect the link.")
    ).toBeInTheDocument();
  });

  it("TC-CLI-DETAIL-08: renders prominent green banner when Requester indicated problem resolved", async () => {
    (api.fetchStaffTicketDetail as any).mockResolvedValue({
      ...mockBaseTicket,
      resolvedIndicated: true,
    });

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByText(/The requester indicated this issue appears resolved/i)).toBeInTheDocument();
    });
  });

  it("TC-CLI-DETAIL-09: renders terminal state message for Closed ticket", async () => {
    (api.fetchStaffTicketDetail as any).mockResolvedValue({
      ...mockBaseTicket,
      status: "Closed",
    });

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByText(/Ticket is in terminal state \(Closed\)\. No further transitions allowed\./i)).toBeInTheDocument();
    });
  });
});

describe("Requester TicketDetail Public Comments & Resolution Indication (Lab 3 — Issue 9)", () => {
  const requesterMockTicket: api.TicketDetail = {
    id: 10,
    ticketNumber: "TKT-2026-000010",
    ticketDate: "2026-09-04T10:30:00.000Z",
    summary: "VPN Connection drops every 15 minutes",
    description: "When working from home, the Cisco AnyConnect client disconnects abruptly.",
    priority: "High",
    status: "In Progress",
    requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    category: { id: 4, name: "Network" },
    relatedSystem: { id: 3, name: "VPN" },
    attachments: [],
    publicComments: [
      {
        id: 10,
        ticketId: 10,
        userId: 1,
        content: "Issue still recurring after reboot.",
        createdAt: "2026-09-04T11:00:00.000Z",
        author: { id: 1, name: "Jennifer Anderson", role: "Requester" },
      },
    ],
    resolvedIndicated: false,
    createdAt: "2026-09-04T10:30:00.000Z",
    updatedAt: "2026-09-04T11:00:00.000Z",
  };

  function renderRequesterView() {
    localStorage.setItem(
      "toktickit_selected_requester",
      JSON.stringify({
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@example.com",
        active: true,
      })
    );

    return render(
      <AuthContext.Provider
        value={{
          ...mockAuthValue,
          user: {
            id: 1,
            name: "Jennifer Anderson",
            email: "jennifer.anderson@example.com",
            role: "Requester",
            mustChangePassword: false,
          },
          token: "requester-jwt-token",
        }}
      >
        <RequesterProvider>
          <TicketDetail ticketId={10} onBack={vi.fn()} />
        </RequesterProvider>
      </AuthContext.Provider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (api.fetchTicketDetail as any).mockResolvedValue(requesterMockTicket);
  });

  it("UI-REQ-DETAIL-01: renders public comments timeline and NEVER exposes internal notes", async () => {
    renderRequesterView();

    await waitFor(() => {
      expect(screen.getByTestId("public-comments-section")).toBeInTheDocument();
    });

    expect(screen.getByText("Issue still recurring after reboot.")).toBeInTheDocument();
    // Verify internal notes are strictly hidden
    expect(screen.queryByText(/Staff Eyes Only/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Internal Notes/i)).not.toBeInTheDocument();
  });

  it("UI-REQ-DETAIL-02: displays 'Problem Appears Resolved' button and invokes indicateProblemResolved", async () => {
    (api.indicateProblemResolved as any).mockResolvedValue({ success: true });

    renderRequesterView();

    await waitFor(() => {
      expect(screen.getByTestId("indicate-resolved-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("indicate-resolved-button"));

    await waitFor(() => {
      expect(api.indicateProblemResolved).toHaveBeenCalledWith("requester-jwt-token", 10);
    });

    expect(screen.getByTestId("resolved-indicated-banner")).toBeInTheDocument();
    expect(screen.getAllByText(/Resolution Indicated/i).length).toBeGreaterThanOrEqual(1);
  });
});
