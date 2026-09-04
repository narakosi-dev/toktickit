import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  fetchTicketDetail,
  uploadAttachment,
  getAttachmentDownloadUrl,
  removeAttachment,
  TicketDetail as ITicketDetail,
  AttachmentItem,
} from "../api.js";

interface Props {
  ticketId: number;
  onBack: () => void;
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
  switch (status) {
    case "In Progress":
      return "badge-status-inprogress";
    case "Resolved":
      return "badge-status-resolved";
    case "New":
    default:
      return "badge-status-new";
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(isoString: string): string {
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

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function TicketDetail({ ticketId, onBack }: Props) {
  const { requester } = useRequester();

  const [ticket, setTicket] = useState<ITicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Soft-remove modal state
  const [targetAttachment, setTargetAttachment] = useState<AttachmentItem | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [removing, setRemoving] = useState(false);

  // Load ticket details
  const loadTicket = useCallback(async () => {
    if (!requester) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchTicketDetail(ticketId, requester.id);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  }, [ticketId, requester]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Handle file upload
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !requester || !ticket) return;

    setUploadError("");

    // Client-side validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError("Unsupported file type. Permitted: JPG, PNG, WEBP, PDF.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File size exceeds 5MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const activeCount = ticket.attachments.filter((a) => a.active).length;
    if (activeCount >= 5) {
      setUploadError("Maximum 5 active attachments allowed per ticket.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const newAttachment = await uploadAttachment(ticket.id, requester.id, file);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              attachments: [...prev.attachments, newAttachment],
            }
          : null
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  }

  // Handle soft removal submit
  async function handleConfirmRemoval() {
    if (!requester || !targetAttachment) return;

    const trimmed = removalReason.trim();
    if (trimmed.length < 5) {
      setRemovalError("Removal reason must be at least 5 characters.");
      return;
    }

    setRemoving(true);
    setRemovalError("");
    try {
      const updated = await removeAttachment(targetAttachment.id, requester.id, trimmed);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              attachments: prev.attachments.map((a) =>
                a.id === updated.id
                  ? {
                      ...a,
                      active: false,
                      removalReason: updated.removalReason,
                      removedAt: updated.removedAt,
                    }
                  : a
              ),
            }
          : null
      );
      // Close modal
      setTargetAttachment(null);
      setRemovalReason("");
    } catch (err: any) {
      setRemovalError(err.message || "Failed to remove attachment");
    } finally {
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <div className="zen-card p-5 text-center my-4" data-testid="ticket-detail-loading">
        <div className="spinner-border text-success mb-3" role="status">
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="text-muted mb-0">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="zen-card p-5 text-center my-4" data-testid="ticket-detail-error">
        <div className="display-6 mb-3">⚠️</div>
        <h3 className="h5 fw-bold mb-2">Ticket Not Found or Unauthorized</h3>
        <p className="text-muted mb-4" style={{ maxWidth: 450, margin: "0 auto" }}>
          {error || "The requested ticket does not exist or you do not have permission to view it."}
        </p>
        <button type="button" className="btn btn-zen-primary" onClick={onBack}>
          ← Back to My Tickets
        </button>
      </div>
    );
  }

  const activeAttachments = ticket.attachments.filter((a) => a.active);
  const activeCount = activeAttachments.length;

  return (
    <div className="d-flex flex-column gap-4" data-testid="ticket-detail-view">
      {/* Top Action Bar */}
      <div className="d-flex justify-content-between align-items-center">
        <button
          type="button"
          className="btn btn-zen-secondary btn-sm d-inline-flex align-items-center gap-1"
          onClick={onBack}
        >
          <span>←</span> Back to My Tickets
        </button>

        <div className="d-flex gap-2 align-items-center">
          <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`}>
            {ticket.priority} Priority
          </span>
          <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
            {ticket.status}
          </span>
        </div>
      </div>

      {/* Main Ticket Information Card */}
      <div className="zen-card p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 border-bottom pb-3 mb-3">
          <div>
            <span
              className="fw-bold font-monospace fs-5"
              style={{ color: "var(--zen-primary)" }}
              data-testid="ticket-number"
            >
              {ticket.ticketNumber}
            </span>
            <h2 className="h4 fw-bold mt-1 mb-0" style={{ color: "var(--zen-text-primary)" }}>
              {ticket.summary}
            </h2>
          </div>
          <div className="text-muted small text-end">
            <div>Submitted on</div>
            <div className="fw-semibold">{formatDate(ticket.ticketDate || ticket.createdAt)}</div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="row g-3 mb-4 bg-light p-3 rounded-3 border">
          <div className="col-12 col-sm-6 col-md-3">
            <span className="text-muted small d-block">Category</span>
            <span className="fw-semibold" style={{ color: "var(--zen-text-primary)" }}>
              {ticket.category.name}
            </span>
          </div>

          <div className="col-12 col-sm-6 col-md-3">
            <span className="text-muted small d-block">Related System</span>
            <span className="fw-semibold" style={{ color: "var(--zen-text-primary)" }}>
              {ticket.relatedSystem.name}
            </span>
          </div>

          <div className="col-12 col-sm-6 col-md-3">
            <span className="text-muted small d-block">Requester</span>
            <span className="fw-semibold" style={{ color: "var(--zen-text-primary)" }}>
              {ticket.requester.name}
            </span>
          </div>

          <div className="col-12 col-sm-6 col-md-3">
            <span className="text-muted small d-block">Contact Email</span>
            <span className="text-muted small text-truncate d-block">
              {ticket.requester.email}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="mb-2">
          <h3 className="h6 fw-bold mb-2" style={{ color: "var(--zen-text-primary)" }}>
            Description
          </h3>
          <div
            className="p-3 rounded-3 border"
            style={{
              backgroundColor: "var(--zen-read-only)",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              color: "var(--zen-text-primary)",
            }}
          >
            {ticket.description}
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="zen-card p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h3 className="h5 fw-bold m-0" style={{ color: "var(--zen-text-primary)" }}>
              Attachments
            </h3>
            <span className="text-muted small">
              ({activeCount} / 5 active attachments)
            </span>
          </div>

          {/* Upload Button & Input */}
          {activeCount < 5 ? (
            <div className="d-flex align-items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                id="attachment-file-input"
                className="d-none"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileSelected}
                disabled={uploading}
              />
              <button
                type="button"
                className="btn btn-zen-primary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "⏳ Uploading..." : "➕ Add Attachment"}
              </button>
            </div>
          ) : (
            <span className="badge bg-warning text-dark border">
              Maximum 5 active attachments reached
            </span>
          )}
        </div>

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="alert alert-danger py-2 small mb-3" role="alert">
            {uploadError}
          </div>
        )}

        {/* Attachment List */}
        {ticket.attachments.length === 0 ? (
          <div className="text-center py-4 text-muted border rounded-3 bg-light">
            <p className="mb-0 small">No attachments uploaded for this ticket.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {ticket.attachments.map((att) => {
              const isPdf = att.mimeType === "application/pdf" || att.originalName.endsWith(".pdf");
              const isImage = att.mimeType.startsWith("image/");
              const icon = isPdf ? "📄" : isImage ? "🖼️" : "📎";

              return (
                <div
                  key={att.id}
                  className={`p-3 border rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-2 ${
                    att.active ? "bg-white" : "bg-light"
                  }`}
                  data-testid={`attachment-item-${att.id}`}
                >
                  {/* File Info */}
                  <div className="d-flex align-items-center gap-3">
                    <span style={{ fontSize: "1.5rem" }}>{icon}</span>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className={`fw-semibold small ${
                            att.active ? "" : "text-muted text-decoration-line-through"
                          }`}
                        >
                          {att.originalName}
                        </span>
                        {!att.active && (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle small">
                            Removed
                          </span>
                        )}
                      </div>
                      <div className="text-muted small" style={{ fontSize: "0.8rem" }}>
                        {formatBytes(att.sizeBytes)} • Uploaded {formatDate(att.createdAt)}
                      </div>

                      {/* Removal Audit Info */}
                      {!att.active && att.removalReason && (
                        <div
                          className="mt-1 text-danger small p-2 rounded"
                          style={{ backgroundColor: "var(--zen-danger-bg)", fontSize: "0.8rem" }}
                        >
                          <strong>Removal Reason:</strong> {att.removalReason}
                          {att.removedAt && (
                            <span className="text-muted ms-2">
                              ({formatDate(att.removedAt)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="d-flex align-items-center gap-2">
                    {att.active ? (
                      <>
                        <a
                          href={getAttachmentDownloadUrl(att.id, requester!.id)}
                          download={att.originalName}
                          className="btn btn-zen-secondary btn-sm"
                          data-testid={`download-attachment-${att.id}`}
                        >
                          ⬇️ Download
                        </a>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => {
                            setTargetAttachment(att);
                            setRemovalReason("");
                            setRemovalError("");
                          }}
                          data-testid={`remove-attachment-${att.id}`}
                        >
                          🗑️ Remove
                        </button>
                      </>
                    ) : (
                      <span className="text-muted small fst-italic">
                        Download unavailable
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Soft-Removal Confirmation Modal */}
      {targetAttachment && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold" style={{ color: "var(--zen-text-primary)" }}>
                  Remove Attachment
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setTargetAttachment(null)}
                  disabled={removing}
                />
              </div>

              <div className="modal-body">
                <p className="small text-muted mb-3">
                  You are about to remove <strong>{targetAttachment.originalName}</strong>. This
                  action soft-removes the file, preserves an audit trail, and disables future
                  downloads.
                </p>

                <div className="mb-3">
                  <label htmlFor="removal-reason-input" className="form-label fw-semibold small">
                    Reason for Removal <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="removal-reason-input"
                    className="form-control"
                    rows={3}
                    placeholder="Enter at least 5 characters explaining why this file is removed..."
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    disabled={removing}
                  />
                  <div className="d-flex justify-content-between mt-1 text-muted small">
                    <span>Minimum 5 characters required</span>
                    <span>{removalReason.trim().length} chars</span>
                  </div>
                </div>

                {removalError && (
                  <div className="alert alert-danger py-2 small" role="alert">
                    {removalError}
                  </div>
                )}
              </div>

              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTargetAttachment(null)}
                  disabled={removing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleConfirmRemoval}
                  disabled={removing || removalReason.trim().length < 5}
                >
                  {removing ? "Removing..." : "Confirm Removal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
