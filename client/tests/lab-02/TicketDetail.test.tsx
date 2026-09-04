import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import TicketDetail from "../../src/components/TicketDetail.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    fetchTicketDetail: vi.fn(),
    uploadAttachment: vi.fn(),
    removeAttachment: vi.fn(),
    getAttachmentDownloadUrl: vi.fn(
      (attId, reqId) => `http://localhost:3000/api/attachments/${attId}/download?requesterId=${reqId}`
    ),
  };
});

const mockTicketData: api.TicketDetail = {
  id: 10,
  ticketNumber: "TKT-2026-000010",
  ticketDate: "2026-09-04T10:30:00.000Z",
  summary: "VPN Connection drops every 15 minutes",
  description: "When working from home, the Cisco AnyConnect client disconnects abruptly.",
  priority: "High",
  status: "New",
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  category: { id: 4, name: "Network" },
  relatedSystem: { id: 3, name: "VPN" },
  attachments: [
    {
      id: 101,
      originalName: "vpn-log.pdf",
      sizeBytes: 204800,
      mimeType: "application/pdf",
      active: true,
      removalReason: null,
      removedAt: null,
      createdAt: "2026-09-04T10:35:00.000Z",
    },
  ],
  createdAt: "2026-09-04T10:30:00.000Z",
  updatedAt: "2026-09-04T10:30:00.000Z",
};

function renderWithRequester(props: { ticketId?: number; onBack?: () => void } = {}) {
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
    <RequesterProvider>
      <TicketDetail ticketId={props.ticketId ?? 10} onBack={props.onBack ?? vi.fn()} />
    </RequesterProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("TicketDetail Component (UI-07)", () => {
  it("UI-07: renders complete ticket details, classification, and active attachments", async () => {
    (api.fetchTicketDetail as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicketData);

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-number")).toHaveTextContent("TKT-2026-000010");
    });

    expect(screen.getByText("VPN Connection drops every 15 minutes")).toBeInTheDocument();
    expect(
      screen.getByText("When working from home, the Cisco AnyConnect client disconnects abruptly.")
    ).toBeInTheDocument();
    expect(screen.getByText("High Priority")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.getByText("VPN")).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();

    // Attachment list check
    expect(screen.getByText("vpn-log.pdf")).toBeInTheDocument();
    expect(screen.getByTestId("download-attachment-101")).toBeInTheDocument();
    expect(screen.getByTestId("remove-attachment-101")).toBeInTheDocument();
  });

  it("UI-07: opens soft-removal modal and enforces minimum 5 characters reason", async () => {
    (api.fetchTicketDetail as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicketData);
    (api.removeAttachment as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 101,
      originalName: "vpn-log.pdf",
      active: false,
      removalReason: "Contains sensitive company IP address",
      removedAt: "2026-09-04T11:00:00.000Z",
    });

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByTestId("remove-attachment-101")).toBeInTheDocument();
    });

    // Click Remove button
    fireEvent.click(screen.getByTestId("remove-attachment-101"));

    // Modal appears
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Remove Attachment")).toBeInTheDocument();

    const reasonInput = screen.getByLabelText(/Reason for Removal/i);
    const confirmButton = screen.getByRole("button", { name: /Confirm Removal/i });

    // Initially disabled because reason is empty
    expect(confirmButton).toBeDisabled();

    // Type 3 chars -> still disabled
    fireEvent.change(reasonInput, { target: { value: "test" } });
    expect(confirmButton).toBeDisabled();

    // Type >= 5 chars -> enabled
    fireEvent.change(reasonInput, {
      target: { value: "Contains sensitive company IP address" },
    });
    expect(confirmButton).not.toBeDisabled();

    // Submit removal
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.removeAttachment).toHaveBeenCalledWith(
        101,
        1,
        "Contains sensitive company IP address"
      );
    });

    // Modal closed and UI reflects Removed status
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Removed")).toBeInTheDocument();
    expect(screen.getByText(/Contains sensitive company IP address/)).toBeInTheDocument();
    expect(screen.getByText("Download unavailable")).toBeInTheDocument();
  });

  it("UI-07: handles attachment upload successfully", async () => {
    (api.fetchTicketDetail as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicketData);
    (api.uploadAttachment as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 102,
      originalName: "screenshot.png",
      sizeBytes: 150000,
      mimeType: "image/png",
      active: true,
      removalReason: null,
      removedAt: null,
      createdAt: "2026-09-04T10:40:00.000Z",
    });

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByText("➕ Add Attachment")).toBeInTheDocument();
    });

    const fileInput = document.querySelector("#attachment-file-input") as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const testFile = new File(["dummy content"], "screenshot.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(api.uploadAttachment).toHaveBeenCalledWith(10, 1, testFile);
    });

    await waitFor(() => {
      expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    });
  });

  it("UI-07: rejects unsupported file types on client-side before API call", async () => {
    (api.fetchTicketDetail as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicketData);

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByText("➕ Add Attachment")).toBeInTheDocument();
    });

    const fileInput = document.querySelector("#attachment-file-input") as HTMLInputElement;
    const invalidFile = new File(["executable binary"], "virus.exe", {
      type: "application/x-msdownload",
    });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Unsupported file type\. Permitted: JPG, PNG, WEBP, PDF\./i)
      ).toBeInTheDocument();
    });

    expect(api.uploadAttachment).not.toHaveBeenCalled();
  });

  it("UI-07: triggers onBack when clicking '← Back to My Tickets'", async () => {
    (api.fetchTicketDetail as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicketData);
    const onBackMock = vi.fn();

    renderWithRequester({ onBack: onBackMock });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Back to My Tickets/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Back to My Tickets/i }));
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it("UI-07: renders friendly error state when ticket is not found or unauthorized", async () => {
    (api.fetchTicketDetail as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Ticket not found or unauthorized access")
    );

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Ticket Not Found or Unauthorized")).toBeInTheDocument();
  });
});
