import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchStaffTicketDetail,
  fetchStaffMembers,
  assignTicket,
  updateTicketPriority,
  updateTicketStatus,
  createPublicComment,
  createInternalNote,
  StaffTicketDetailData,
  StaffMember,
  CommentItem,
  InternalNoteItem,
  getAttachmentDownloadUrl,
} from "../api.js";

interface Props {
  ticketId: number;
  onBack: () => void;
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  New: ["Assigned", "Open", "In_Progress", "Cancelled"],
  Open: ["In_Progress", "Pending_Requester", "Resolved", "Cancelled"],
  Assigned: ["In_Progress", "Pending_Requester", "Resolved", "Cancelled"],
  In_Progress: ["Pending_Requester", "Resolved", "Cancelled"],
  Pending_Requester: ["In_Progress", "Resolved", "Cancelled"],
  Resolved: ["Closed", "In_Progress", "Reopened"],
  Reopened: ["In_Progress", "Pending_Requester", "Resolved", "Cancelled"],
  Closed: [],
  Cancelled: [],
};

function normalizeStatus(st: string): string {
  const s = st.trim().toLowerCase();
  if (s === "new") return "New";
  if (s === "open") return "Open";
  if (s === "assigned") return "Assigned";
  if (s === "in_progress" || s === "in progress") return "In_Progress";
  if (
    s === "pending_requester" ||
    s === "pending requester" ||
    s === "waiting for requester" ||
    s === "waiting_for_requester"
  )
    return "Pending_Requester";
  if (s === "resolved") return "Resolved";
  if (s === "closed") return "Closed";
  if (s === "reopened") return "Reopened";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  return st.trim();
}

function formatStatusDisplay(status: string): string {
  switch (status) {
    case "In_Progress":
      return "In Progress";
    case "Pending_Requester":
      return "Waiting for Requester";
    default:
      return status.replace(/_/g, " ");
  }
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "Critical":
      return "badge-priority-critical";
    case "High":
      return "badge-priority-high";
    case "Medium":
      return "badge-priority-medium";
    case "Low":
    default:
      return "badge-priority-low";
  }
}

function getStatusBadgeClass(status: string): string {
  const norm = normalizeStatus(status);
  switch (norm) {
    case "In_Progress":
      return "badge-status-inprogress";
    case "Pending_Requester":
      return "badge-status-pending";
    case "Resolved":
      return "badge-status-resolved";
    case "Closed":
      return "badge-status-closed";
    case "Cancelled":
      return "badge-status-cancelled";
    case "Assigned":
    case "Open":
      return "badge-status-assigned";
    case "New":
    default:
      return "badge-status-new";
  }
}

function formatDateTime(isoString: string): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function StaffTicketDetail({ ticketId, onBack }: Props) {
  const { user, token } = useAuth();

  const [ticket, setTicket] = useState<StaffTicketDetailData | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tabs: "comments" (Public) vs "notes" (Internal)
  const [activeTab, setActiveTab] = useState<"comments" | "notes">("comments");

  // Operational states
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const [assigning, setAssigning] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [opSuccessMessage, setOpSuccessMessage] = useState("");
  const [opErrorMessage, setOpErrorMessage] = useState("");

  // Conversation input state
  const [commentInput, setCommentInput] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [noteInput, setNoteInput] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  // Load ticket and staff list
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [ticketData, members] = await Promise.all([
        fetchStaffTicketDetail(token, ticketId),
        fetchStaffMembers(token).catch(() => []),
      ]);
      setTicket(ticketData);
      setStaffMembers(members);

      // Initialize dropdown selections
      const currentAssignee = ticketData.assignedTo || ticketData.owner;
      setSelectedStaffId(currentAssignee ? String(currentAssignee.id) : "");
      setSelectedPriority(ticketData.itPriority || ticketData.priority);
      setSelectedStatus("");
    } catch (err: any) {
      setError(err.message || "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  }, [ticketId, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Operations: Claim Ticket
  async function handleClaim() {
    if (!token || !user || !ticket) return;
    setAssigning(true);
    setOpSuccessMessage("");
    setOpErrorMessage("");
    try {
      await assignTicket(token, ticket.id, user.id);
      setOpSuccessMessage("Ticket claimed successfully.");
      loadData();
    } catch (err: any) {
      setOpErrorMessage(err.message || "Failed to claim ticket");
    } finally {
      setAssigning(false);
    }
  }

  // Operations: Reassign Ticket
  async function handleReassign() {
    if (!token || !ticket) return;
    setAssigning(true);
    setOpSuccessMessage("");
    setOpErrorMessage("");
    try {
      const targetStaffId = selectedStaffId ? parseInt(selectedStaffId, 10) : null;
      await assignTicket(token, ticket.id, targetStaffId);
      setOpSuccessMessage("Assignee updated successfully.");
      loadData();
    } catch (err: any) {
      setOpErrorMessage(err.message || "Failed to assign ticket");
    } finally {
      setAssigning(false);
    }
  }

  // Operations: Update IT Priority
  async function handlePriorityUpdate() {
    if (!token || !ticket || !selectedPriority) return;
    setUpdatingPriority(true);
    setOpSuccessMessage("");
    setOpErrorMessage("");
    try {
      await updateTicketPriority(token, ticket.id, selectedPriority);
      setOpSuccessMessage(`IT Priority updated to ${selectedPriority}.`);
      loadData();
    } catch (err: any) {
      setOpErrorMessage(err.message || "Failed to update IT priority");
    } finally {
      setUpdatingPriority(false);
    }
  }

  // Operations: Update Status
  async function handleStatusUpdate() {
    if (!token || !ticket || !selectedStatus) return;
    setUpdatingStatus(true);
    setOpSuccessMessage("");
    setOpErrorMessage("");
    try {
      await updateTicketStatus(token, ticket.id, selectedStatus);
      setOpSuccessMessage(`Status transitioned to ${formatStatusDisplay(selectedStatus)}.`);
      loadData();
    } catch (err: any) {
      setOpErrorMessage(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  // Submit Public Comment
  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !ticket) return;
    const trimmed = commentInput.trim();
    if (!trimmed) {
      setCommentError("Comment cannot be empty");
      return;
    }
    if (trimmed.length > 1000) {
      setCommentError("Comment cannot exceed 1000 characters");
      return;
    }

    setPostingComment(true);
    setCommentError("");
    try {
      const created = await createPublicComment(token, ticket.id, trimmed);
      setTicket((prev) => {
        if (!prev) return null;
        const currentComments = prev.publicComments || [];
        return {
          ...prev,
          publicComments: [...currentComments, created],
        };
      });
      setCommentInput("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  }

  // Submit Internal Note
  async function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !ticket) return;
    const trimmed = noteInput.trim();
    if (!trimmed) {
      setNoteError("Internal note cannot be empty");
      return;
    }
    if (trimmed.length > 1000) {
      setNoteError("Internal note cannot exceed 1000 characters");
      return;
    }

    setPostingNote(true);
    setNoteError("");
    try {
      const created = await createInternalNote(token, ticket.id, trimmed);
      setTicket((prev) => {
        if (!prev) return null;
        const currentNotes = prev.internalNotes || [];
        return {
          ...prev,
          internalNotes: [...currentNotes, created],
        };
      });
      setNoteInput("");
    } catch (err: any) {
      setNoteError(err.message || "Failed to save internal note");
    } finally {
      setPostingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="zen-card p-4">
        <div className="alert alert-danger" role="alert">
          {error || "Ticket not found"}
        </div>
        <button type="button" className="btn btn-zen-outline" onClick={onBack}>
          &larr; Back to Ticket Queue
        </button>
      </div>
    );
  }

  const currentNormalizedStatus = normalizeStatus(ticket.status);
  const permittedNextStatuses = VALID_STATUS_TRANSITIONS[currentNormalizedStatus] || [];
  const isTerminal = permittedNextStatuses.length === 0;

  const currentAssignee = ticket.assignedTo || ticket.owner;
  const isUnassigned = !currentAssignee;
  const hasRequesterIndicatedResolved = Boolean(
    ticket.resolvedIndicated || ticket.resolvedByRequester
  );

  const comments = ticket.publicComments || [];
  const notes = ticket.internalNotes || [];

  return (
    <div className="staff-ticket-detail">
      {/* Top Header & Breadcrumb */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-zen-outline btn-sm"
            onClick={onBack}
            aria-label="Back to Ticket Queue"
          >
            &larr; Back to Queue
          </button>
          <span className="text-muted small">Ticket Queue &gt; Ticket Detail</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className={`badge ${getStatusBadgeClass(ticket.status)}`} style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
            {formatStatusDisplay(ticket.status)}
          </span>
          <span className={`badge ${getPriorityBadgeClass(ticket.itPriority || ticket.priority)}`} style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
            {ticket.itPriority ? `IT: ${ticket.itPriority}` : ticket.priority}
          </span>
        </div>
      </div>

      {/* Prominent Resolution Indicator Banner (FR-21 / BR-11) */}
      {hasRequesterIndicatedResolved && (
        <div
          className="alert alert-success d-flex align-items-center gap-2 mb-3 shadow-sm"
          role="alert"
          style={{ borderLeft: "5px solid #006B3C", backgroundColor: "#E8F5E9" }}
        >
          <span style={{ fontSize: "1.25rem" }}>✅</span>
          <div>
            <strong>Requester Indication:</strong> The requester indicated this issue appears resolved. Please review and confirm formal closure.
          </div>
        </div>
      )}

      {/* Operational Alerts */}
      {opSuccessMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {opSuccessMessage}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setOpSuccessMessage("")}></button>
        </div>
      )}
      {opErrorMessage && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {opErrorMessage}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setOpErrorMessage("")}></button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="row g-4">
        {/* Left Column: Metadata & Operational Controls */}
        <div className="col-12 col-lg-5">
          {/* Ticket Information Card */}
          <div className="zen-card p-4 mb-4">
            <h1 className="h4 fw-bold mb-2 text-zen-primary d-flex align-items-center gap-2">
              <span>🎫</span>
              <span>{ticket.ticketNumber}</span>
            </h1>
            <h2 className="h5 fw-semibold mb-3">{ticket.summary}</h2>

            <div className="mb-3 text-muted small">
              <div><strong>Created:</strong> {formatDateTime(ticket.ticketDate || ticket.createdAt)}</div>
              <div><strong>Category:</strong> {ticket.category?.name || "General"}</div>
              <div><strong>Related System:</strong> {ticket.relatedSystem?.name || "General"}</div>
            </div>

            <div className="mb-3 p-3 rounded" style={{ backgroundColor: "#F9FAF9", border: "1px solid #E0E8E3" }}>
              <div className="fw-semibold small text-muted mb-1">Requester Information</div>
              <div className="fw-bold">{ticket.requester?.name || "Unknown"}</div>
              <div className="text-muted small">{ticket.requester?.email || "No email"}</div>
            </div>

            <div className="mb-2">
              <div className="fw-semibold small text-muted mb-1">Description</div>
              <p className="text-secondary" style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Operational Action Panel Card */}
          <div className="zen-card p-4 mb-4">
            <h3 className="h6 fw-bold text-uppercase text-muted mb-3 d-flex align-items-center gap-2">
              <span>⚙️</span>
              <span>Staff Operations</span>
            </h3>

            {/* Claim Ticket Button */}
            {isUnassigned && (
              <div className="mb-3 p-3 rounded bg-light border">
                <div className="small text-muted mb-2">This ticket is currently unassigned.</div>
                <button
                  type="button"
                  className="btn btn-zen-primary w-100 fw-semibold"
                  onClick={handleClaim}
                  disabled={assigning}
                >
                  {assigning ? "Claiming..." : "Claim Ticket"}
                </button>
              </div>
            )}

            {/* Reassign Owner Dropdown */}
            <div className="mb-3">
              <label htmlFor="staff-reassign-select" className="form-label small fw-semibold">
                Assigned Staff Member
              </label>
              <div className="d-flex gap-2">
                <select
                  id="staff-reassign-select"
                  className="form-select form-select-sm"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  disabled={assigning}
                >
                  <option value="">-- Unassigned --</option>
                  {staffMembers.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-zen-outline btn-sm text-nowrap"
                  onClick={handleReassign}
                  disabled={assigning}
                >
                  {assigning ? "Saving..." : "Reassign"}
                </button>
              </div>
            </div>

            {/* IT Priority Selector */}
            <div className="mb-3">
              <label htmlFor="staff-priority-select" className="form-label small fw-semibold">
                IT Priority Override (Requested: {ticket.priority})
              </label>
              <div className="d-flex gap-2">
                <select
                  id="staff-priority-select"
                  className="form-select form-select-sm"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  disabled={updatingPriority}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <button
                  type="button"
                  className="btn btn-zen-outline btn-sm text-nowrap"
                  onClick={handlePriorityUpdate}
                  disabled={updatingPriority || selectedPriority === (ticket.itPriority || ticket.priority)}
                >
                  {updatingPriority ? "Saving..." : "Set Priority"}
                </button>
              </div>
            </div>

            {/* Status Transition Selector */}
            <div className="mb-2">
              <label htmlFor="staff-status-select" className="form-label small fw-semibold">
                Transition Status (Current: {formatStatusDisplay(ticket.status)})
              </label>
              {isTerminal ? (
                <div className="text-muted small fst-italic">
                  Ticket is in terminal state ({formatStatusDisplay(ticket.status)}). No further transitions allowed.
                </div>
              ) : (
                <div className="d-flex gap-2">
                  <select
                    id="staff-status-select"
                    className="form-select form-select-sm"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    disabled={updatingStatus}
                  >
                    <option value="">-- Select next status --</option>
                    {permittedNextStatuses.map((st) => (
                      <option key={st} value={st}>
                        {formatStatusDisplay(st)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-zen-primary btn-sm text-nowrap"
                    onClick={handleStatusUpdate}
                    disabled={updatingStatus || !selectedStatus}
                  >
                    {updatingStatus ? "Updating..." : "Update Status"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Attachments Card */}
          <div className="zen-card p-4">
            <h3 className="h6 fw-bold text-uppercase text-muted mb-3 d-flex align-items-center gap-2">
              <span>📎</span>
              <span>Attachments ({ticket.attachments?.filter((a) => a.active).length || 0})</span>
            </h3>
            {(!ticket.attachments || ticket.attachments.filter((a) => a.active).length === 0) ? (
              <p className="text-muted small mb-0">No active attachments uploaded.</p>
            ) : (
              <ul className="list-group list-group-flush">
                {ticket.attachments
                  .filter((a) => a.active)
                  .map((a) => (
                    <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                      <div>
                        <div className="fw-semibold small text-truncate" style={{ maxWidth: 220 }}>
                          {a.originalName}
                        </div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {formatBytes(a.sizeBytes)} &bull; {formatDateTime(a.createdAt)}
                        </div>
                      </div>
                      {ticket.requester?.id ? (
                        <a
                          href={getAttachmentDownloadUrl(a.id, ticket.requester.id)}
                          className="btn btn-zen-outline btn-sm py-0 px-2"
                          target="_blank"
                          rel="noreferrer"
                          title="Download Attachment"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-muted small fst-italic">Unavailable</span>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Communication Center (Tabs for Public Comments vs Internal Notes) */}
        <div className="col-12 col-lg-7">
          <div className="zen-card p-4">
            {/* Tab Switcher */}
            <div className="d-flex border-bottom mb-4 gap-2">
              <button
                type="button"
                className={`btn pb-2 px-3 fw-bold rounded-0 ${
                  activeTab === "comments"
                    ? "border-bottom border-3 border-success text-success"
                    : "text-muted"
                }`}
                style={{ backgroundColor: "transparent" }}
                onClick={() => setActiveTab("comments")}
                role="tab"
                aria-selected={activeTab === "comments"}
              >
                💬 Public Conversation ({comments.length})
              </button>
              <button
                type="button"
                className={`btn pb-2 px-3 fw-bold rounded-0 ${
                  activeTab === "notes"
                    ? "border-bottom border-3 border-warning text-dark"
                    : "text-muted"
                }`}
                style={{ backgroundColor: "transparent" }}
                onClick={() => setActiveTab("notes")}
                role="tab"
                aria-selected={activeTab === "notes"}
              >
                🔒 Internal Notes (Confidential) ({notes.length})
              </button>
            </div>

            {/* TAB 1: Public Comments */}
            {activeTab === "comments" && (
              <div className="public-comments-panel">
                <div
                  className="p-3 mb-4 rounded"
                  style={{ backgroundColor: "#F0F8F3", border: "1px solid #0B7A46" }}
                >
                  <span className="fw-semibold small text-success">
                    Public comments are visible to the Requester and all IT Staff.
                  </span>
                </div>

                {/* Comments Timeline */}
                <div className="timeline mb-4" style={{ maxHeight: 420, overflowY: "auto" }}>
                  {comments.length === 0 ? (
                    <p className="text-muted text-center py-4 fst-italic">No public comments yet.</p>
                  ) : (
                    comments.map((c: CommentItem) => {
                      const author = c.author || c.user;
                      const isAuthorRequester = author?.role === "Requester";
                      return (
                        <div
                          key={c.id}
                          className="p-3 mb-3 rounded"
                          style={{
                            backgroundColor: isAuthorRequester ? "#F4F6F5" : "#EAF4EE",
                            borderLeft: isAuthorRequester ? "4px solid #888" : "4px solid #006B3C",
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold small d-flex align-items-center gap-2">
                              {author?.name || "User"}
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: isAuthorRequester ? "#6c757d" : "#006B3C",
                                  fontSize: "0.65rem",
                                }}
                              >
                                {author?.role || "User"}
                              </span>
                            </span>
                            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                              {formatDateTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="mb-0 text-secondary" style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                            {c.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Comment Input Form */}
                <form onSubmit={handleSubmitComment}>
                  {commentError && <div className="alert alert-danger small py-2">{commentError}</div>}
                  <div className="mb-2">
                    <label htmlFor="public-comment-input" className="form-label small fw-semibold">
                      Add a Public Comment
                    </label>
                    <textarea
                      id="public-comment-input"
                      className="form-control"
                      rows={3}
                      placeholder="Write a message visible to the requester..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      disabled={postingComment}
                      maxLength={1000}
                    />
                    <div className="text-end text-muted small mt-1">
                      {commentInput.length}/1000 characters
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-zen-primary btn-sm px-3"
                    disabled={postingComment || !commentInput.trim()}
                  >
                    {postingComment ? "Posting..." : "Post Public Comment"}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Confidential Internal Notes */}
            {activeTab === "notes" && (
              <div className="internal-notes-panel">
                {/* Prominent Amber Warning Banner (TC-CLI-DETAIL-06 / UI-Spec) */}
                <div
                  className="p-3 mb-4 rounded"
                  style={{ backgroundColor: "#FFF9E6", border: "1px solid #B58105" }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: "1.2rem" }}>🔒</span>
                    <div>
                      <strong className="text-dark d-block">Staff Eyes Only</strong>
                      <span className="small text-muted">
                        Internal Notes are confidential and visible strictly to IT Staff and Administrators. Requesters cannot see these notes.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes Timeline */}
                <div className="timeline mb-4" style={{ maxHeight: 420, overflowY: "auto" }}>
                  {notes.length === 0 ? (
                    <p className="text-muted text-center py-4 fst-italic">No confidential internal notes recorded.</p>
                  ) : (
                    notes.map((n: InternalNoteItem) => {
                      const author = n.author || n.user;
                      return (
                        <div
                          key={n.id}
                          className="p-3 mb-3 rounded"
                          style={{
                            backgroundColor: "#FFFDF5",
                            border: "1px solid #F0E0B0",
                            borderLeft: "4px solid #B58105",
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold small d-flex align-items-center gap-2">
                              {author?.name || "Staff Member"}
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: "#B58105",
                                  fontSize: "0.65rem",
                                }}
                              >
                                {author?.role || "IT_Staff"}
                              </span>
                            </span>
                            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                              {formatDateTime(n.createdAt)}
                            </span>
                          </div>
                          <p className="mb-0 text-secondary" style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                            {n.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Note Input Form */}
                <form onSubmit={handleSubmitNote}>
                  {noteError && <div className="alert alert-danger small py-2">{noteError}</div>}
                  <div className="mb-2">
                    <label htmlFor="internal-note-input" className="form-label small fw-semibold">
                      Add a Confidential Internal Note
                    </label>
                    <textarea
                      id="internal-note-input"
                      className="form-control"
                      rows={3}
                      placeholder="Record private technical notes, vendor tickets, or diagnosis details..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      disabled={postingNote}
                      maxLength={1000}
                    />
                    <div className="text-end text-muted small mt-1">
                      {noteInput.length}/1000 characters
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-warning btn-sm px-3 fw-semibold text-dark"
                    disabled={postingNote || !noteInput.trim()}
                  >
                    {postingNote ? "Saving..." : "Save Internal Note"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
