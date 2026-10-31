import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import ActionsTakenSection from "../../src/components/ActionsTakenSection.js";
import * as api from "../../src/api.js";

// Mock API functions
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return {
    ...actual,
    fetchActionsTaken: vi.fn(),
    createActionTaken: vi.fn(),
    updateActionTaken: vi.fn(),
  };
});

const mockStaffMembers: api.StaffMember[] = [
  { id: 2, name: "Michael Brown", email: "michael.brown@toktickit.com", role: "IT_Staff" },
  { id: 3, name: "Sarah Connor", email: "sarah.connor@toktickit.com", role: "IT_Staff" },
];

const mockActionsList: api.ActionTakenItem[] = [
  {
    id: 1,
    ticketId: 101,
    performedById: 2,
    actionDateTime: "2026-10-29T08:30:00.000Z",
    description: "Replaced faulty Cisco VPN router power supply and re-terminated patch cable.",
    result: "Gateway restored to active service, ping latency stabilized at 12ms.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: "power_diag.log",
    createdAt: "2026-10-29T08:35:00.000Z",
    updatedAt: "2026-10-29T08:35:00.000Z",
    performedBy: {
      id: 2,
      name: "Michael Brown",
      email: "michael.brown@toktickit.com",
      role: "IT_Staff",
    },
  },
  {
    id: 2,
    ticketId: 101,
    performedById: 3,
    actionDateTime: "2026-10-29T10:00:00.000Z",
    description: "Ran firmware upgrade v4.2.1 on VPN appliance to patch SSL memory leak.",
    result: "Firmware installed successfully, warm reboot executed.",
    followUpRequired: true,
    followUpNote: "Monitor memory buffer utilization for 24 hours under peak load.",
    attachmentNotes: "firmware_upgrade_v4.log",
    createdAt: "2026-10-29T10:05:00.000Z",
    updatedAt: "2026-10-29T10:05:00.000Z",
    performedBy: {
      id: 3,
      name: "Sarah Connor",
      email: "sarah.connor@toktickit.com",
      role: "IT_Staff",
    },
  },
];

describe("ActionsTakenSection Component (Lab 4 — Issue 6 / UI-ACT)", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UI-ACT-01: renders Actions Taken list in Ticket Detail for IT Staff with date, technician, description, result, and follow-up badges", async () => {
    (api.fetchActionsTaken as any).mockResolvedValue({
      ticketId: 101,
      ticketNumber: "TKT-2026-000101",
      totalActions: 2,
      actionsTaken: mockActionsList,
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        token="mock-staff-jwt-token"
        readOnly={false}
        staffMembers={mockStaffMembers}
        currentUserId={2}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Actions Taken \(2\)/i)).toBeInTheDocument();
    });

    // Check Action 1 details
    expect(screen.getByText(/Replaced faulty Cisco VPN router power supply/i)).toBeInTheDocument();
    expect(screen.getByText(/Gateway restored to active service/i)).toBeInTheDocument();
    expect(screen.getByText(/Michael Brown/i)).toBeInTheDocument();
    expect(screen.getByText(/✓ No Follow-Up Needed/i)).toBeInTheDocument();
    expect(screen.getByText(/power_diag.log/i)).toBeInTheDocument();

    // Check Action 2 details
    expect(screen.getByText(/Ran firmware upgrade v4.2.1/i)).toBeInTheDocument();
    expect(screen.getByText(/Firmware installed successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/Sarah Connor/i)).toBeInTheDocument();
    expect(screen.getByText(/⚠️ Follow-Up Required/i)).toBeInTheDocument();
    expect(screen.getByText(/Monitor memory buffer utilization for 24 hours/i)).toBeInTheDocument();

    // Verify IT Staff controls are visible
    expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Edit Action/i }).length).toBe(2);
  });

  it("UI-ACT-02: submitting Action Taken form with Follow-Up ON and empty note triggers validation error (AC-02 / BR-03)", async () => {
    (api.fetchActionsTaken as any).mockResolvedValue({
      ticketId: 101,
      ticketNumber: "TKT-2026-000101",
      totalActions: 0,
      actionsTaken: [],
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        token="mock-staff-jwt-token"
        readOnly={false}
        staffMembers={mockStaffMembers}
        currentUserId={2}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
    });

    // Open Create Modal
    await user.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));
    expect(screen.getByText("Record Action Taken")).toBeInTheDocument();

    // Fill valid Description and Result
    const descInput = screen.getByLabelText(/Action Description/i);
    const resultInput = screen.getByLabelText(/Result \/ Outcome/i);
    await user.type(descInput, "Diagnosed DNS routing failure on secondary subnet");
    await user.type(resultInput, "Flush DNS cache and reconfigured BIND server");

    // Toggle Follow-Up Required to ON
    const followUpToggle = screen.getByLabelText(/Follow-Up Required\?/i);
    await user.click(followUpToggle);

    // Follow-up Note is initially empty; click Save
    const saveButton = screen.getByRole("button", { name: /Save Action Taken/i });
    await user.click(saveButton);

    // Assert validation error matches BR-03 requirement
    expect(
      await screen.findByText(/Follow-up note is required when follow-up is needed/i)
    ).toBeInTheDocument();

    // Verify createActionTaken was NOT called
    expect(api.createActionTaken).not.toHaveBeenCalled();

    // Enter short note (< 5 chars)
    const noteInput = screen.getByLabelText(/Follow-Up Note/i);
    await user.type(noteInput, "abc");
    await user.click(saveButton);
    expect(screen.getByText(/Follow-up note is required when follow-up is needed/i)).toBeInTheDocument();
    expect(api.createActionTaken).not.toHaveBeenCalled();
  });

  it("UI-ACT-03: renders Actions Taken in Ticket Detail for Requester in read-only mode (Add/Edit buttons omitted from DOM)", async () => {
    (api.fetchActionsTaken as any).mockResolvedValue({
      ticketId: 101,
      ticketNumber: "TKT-2026-000101",
      totalActions: 2,
      actionsTaken: mockActionsList,
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        token="mock-requester-jwt-token"
        readOnly={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Actions Taken \(2\)/i)).toBeInTheDocument();
    });

    // Requester can view both actions and technical notes
    expect(screen.getByText(/Replaced faulty Cisco VPN router power supply/i)).toBeInTheDocument();
    expect(screen.getByText(/Ran firmware upgrade v4.2.1/i)).toBeInTheDocument();
    expect(screen.getByText(/Read-Only View/i)).toBeInTheDocument();

    // Verify Add Action Taken button is completely omitted from the DOM
    expect(screen.queryByRole("button", { name: /\+ Add Action Taken/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("add-action-taken-btn")).not.toBeInTheDocument();

    // Verify all Edit buttons are completely omitted from the DOM
    expect(screen.queryByRole("button", { name: /Edit Action/i })).not.toBeInTheDocument();
  });

  it("UI-ACT-04: successfully creates an Action Taken with default logged-in technician and asserts performedById (FR-02 / AC-01)", async () => {
    (api.fetchActionsTaken as any).mockResolvedValueOnce({
      ticketId: 101,
      ticketNumber: "TKT-2026-000101",
      totalActions: 0,
      actionsTaken: [],
    });

    const newCreatedAction: api.ActionTakenItem = {
      id: 3,
      ticketId: 101,
      performedById: 3, // Sarah Connor (currentUserId 3)
      actionDateTime: "2026-10-30T14:00:00.000Z",
      description: "Tested throughput across dual-band Wi-Fi channels.",
      result: "Packet loss eliminated, bandwidth achieved 450 Mbps.",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
      createdAt: "2026-10-30T14:05:00.000Z",
      updatedAt: "2026-10-30T14:05:00.000Z",
      performedBy: { id: 3, name: "Sarah Connor", role: "IT_Staff" },
    };

    (api.createActionTaken as any).mockResolvedValue(newCreatedAction);
    (api.fetchActionsTaken as any).mockResolvedValueOnce({
      ticketId: 101,
      ticketNumber: "TKT-2026-000101",
      totalActions: 1,
      actionsTaken: [newCreatedAction],
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        token="mock-staff-jwt-token"
        readOnly={false}
        staffMembers={mockStaffMembers}
        currentUserId={3} // Sarah Connor logged in
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));

    // Verify Performed By defaults to current logged-in technician (3)
    const select = screen.getByLabelText(/Performed By/i) as HTMLSelectElement;
    expect(select.value).toBe("3");

    await user.type(
      screen.getByLabelText(/Action Description/i),
      "Tested throughput across dual-band Wi-Fi channels."
    );
    await user.type(
      screen.getByLabelText(/Result \/ Outcome/i),
      "Packet loss eliminated, bandwidth achieved 450 Mbps."
    );

    await user.click(screen.getByRole("button", { name: /Save Action Taken/i }));

    await waitFor(() => {
      expect(api.createActionTaken).toHaveBeenCalledWith(
        "mock-staff-jwt-token",
        101,
        expect.objectContaining({
          description: "Tested throughput across dual-band Wi-Fi channels.",
          result: "Packet loss eliminated, bandwidth achieved 450 Mbps.",
          followUpRequired: false,
          performedById: 3, // Assert performedById is strictly sent matching current technician
        })
      );
    });

    // Timeline re-fetched and displays new action
    expect(await screen.findByText(/Tested throughput across dual-band Wi-Fi channels./i)).toBeInTheDocument();
  });

  it("UI-ACT-05: opens edit modal, pre-fills values, and submits only changed fields (FR-03 / AC-03)", async () => {
    (api.fetchActionsTaken as any).mockResolvedValue({
      ticketId: 101,
      ticketNumber: "TKT-2026-000101",
      totalActions: 1,
      actionsTaken: [mockActionsList[0]],
    });

    (api.updateActionTaken as any).mockResolvedValue({
      ...mockActionsList[0],
      description: "Replaced faulty Cisco VPN router power supply and re-crimped RJ45 connectors.",
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        token="mock-staff-jwt-token"
        readOnly={false}
        staffMembers={mockStaffMembers}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit Action #1/i })).toBeInTheDocument();
    });

    // Click Edit button
    await user.click(screen.getByRole("button", { name: /Edit Action #1/i }));

    expect(screen.getByText("Edit Action Taken #1")).toBeInTheDocument();
    const descInput = screen.getByLabelText(/Action Description/i) as HTMLTextAreaElement;
    expect(descInput.value).toContain("Replaced faulty Cisco VPN router power supply");

    // Modify description
    await user.clear(descInput);
    await user.type(descInput, "Replaced faulty Cisco VPN router power supply and re-crimped RJ45 connectors.");

    await user.click(screen.getByRole("button", { name: /Save Action Taken/i }));

    await waitFor(() => {
      expect(api.updateActionTaken).toHaveBeenCalledWith(
        "mock-staff-jwt-token",
        101,
        1,
        expect.objectContaining({
          description: "Replaced faulty Cisco VPN router power supply and re-crimped RJ45 connectors.",
        })
      );
    });
  });

  it("UI-ACT-06: validates minimum 5-character length on description and result (BR-01 / BR-02)", async () => {
    (api.fetchActionsTaken as any).mockResolvedValue({
      ticketId: 101,
      ticketNumber: "TKT-2026-000101",
      totalActions: 0,
      actionsTaken: [],
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        token="mock-staff-jwt-token"
        readOnly={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));

    // Try submitting empty
    await user.click(screen.getByRole("button", { name: /Save Action Taken/i }));

    expect(await screen.findByText(/Description must be at least 5 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/Result must be at least 5 characters/i)).toBeInTheDocument();
    expect(api.createActionTaken).not.toHaveBeenCalled();
  });

  it("UI-ACT-07: displays error message when fetchActionsTaken fails (AC-01 / NFR-02)", async () => {
    (api.fetchActionsTaken as any).mockRejectedValue(new Error("Network connection lost"));

    render(
      <ActionsTakenSection
        ticketId={101}
        token="mock-staff-jwt-token"
        readOnly={false}
      />
    );

    expect(await screen.findByText(/Network connection lost/i)).toBeInTheDocument();
  });

  it("UI-ACT-08: stops loading spinner and displays empty state when token is null", async () => {
    render(
      <ActionsTakenSection
        ticketId={101}
        token={null}
        readOnly={true}
      />
    );

    // Verify loading spinner is NOT displayed
    expect(screen.queryByText(/Loading technical actions/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No technical actions recorded yet/i)).toBeInTheDocument();
    expect(api.fetchActionsTaken).not.toHaveBeenCalled();
  });

  it("UI-ACT-09: closes modal when user presses Escape key", async () => {
    (api.fetchActionsTaken as any).mockResolvedValue({
      ticketId: 101,
      ticketNumber: "TKT-2026-000101",
      totalActions: 0,
      actionsTaken: [],
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        token="mock-staff-jwt-token"
        readOnly={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));
    expect(screen.getByText("Record Action Taken")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Record Action Taken")).not.toBeInTheDocument();
  });
});
