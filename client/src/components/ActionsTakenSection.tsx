import React, { useState, useEffect, useCallback } from "react";
import {
  fetchActionsTaken,
  createActionTaken,
  updateActionTaken,
  ActionTakenItem,
  StaffMember,
} from "../api.js";

interface Props {
  ticketId: number;
  token: string | null;
  readOnly?: boolean;
  staffMembers?: StaffMember[];
  onActionsChange?: (count: number) => void;
}

function formatDateTime(isoString: string): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function ActionsTakenSection({
  ticketId,
  token,
  readOnly = false,
  staffMembers = [],
  onActionsChange,
}: Props) {
  const [actions, setActions] = useState<ActionTakenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);

  // Form fields
  const [actionDateTime, setActionDateTime] = useState("");
  const [performedById, setPerformedById] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");

  // Form status & validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadActions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchActionsTaken(token, ticketId);
      const list = data.actionsTaken || [];
      setActions(list);
      if (onActionsChange) {
        onActionsChange(list.length);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load actions taken");
    } finally {
      setLoading(false);
    }
  }, [ticketId, token, onActionsChange]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  function handleOpenCreate() {
    setEditingActionId(null);
    setActionDateTime(toLocalDatetimeInput(new Date()));
    setPerformedById(staffMembers.length > 0 ? staffMembers[0].id : "");
    setDescription("");
    setResult("");
    setFollowUpRequired(false);
    setFollowUpNote("");
    setAttachmentNotes("");
    setFieldErrors({});
    setSubmitError("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(action: ActionTakenItem) {
    setEditingActionId(action.id);
    const d = new Date(action.actionDateTime);
    setActionDateTime(isNaN(d.getTime()) ? toLocalDatetimeInput(new Date()) : toLocalDatetimeInput(d));
    setPerformedById(action.performedById || (staffMembers.length > 0 ? staffMembers[0].id : ""));
    setDescription(action.description || "");
    setResult(action.result || "");
    setFollowUpRequired(Boolean(action.followUpRequired));
    setFollowUpNote(action.followUpNote || "");
    setAttachmentNotes(action.attachmentNotes || "");
    setFieldErrors({});
    setSubmitError("");
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingActionId(null);
    setFieldErrors({});
    setSubmitError("");
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!description.trim() || description.trim().length < 5) {
      errors.description = "Description must be at least 5 characters";
    }

    if (!result.trim() || result.trim().length < 5) {
      errors.result = "Result must be at least 5 characters";
    }

    if (followUpRequired) {
      if (!followUpNote.trim() || followUpNote.trim().length < 5) {
        errors.followUpNote = "Follow-up note is required when follow-up is needed";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload: any = {
        description: description.trim(),
        result: result.trim(),
        followUpRequired,
        followUpNote: followUpRequired ? followUpNote.trim() : null,
        attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
      };

      if (actionDateTime) {
        payload.actionDateTime = new Date(actionDateTime).toISOString();
      }

      if (performedById !== "") {
        payload.performedById = Number(performedById);
      }

      if (editingActionId !== null) {
        await updateActionTaken(token, ticketId, editingActionId, payload);
      } else {
        await createActionTaken(token, ticketId, payload);
      }

      handleCloseModal();
      await loadActions();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to save action taken");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="actions-taken-section zen-card p-4 mb-4" data-testid="actions-taken-section">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div className="d-flex align-items-center gap-2">
          <h3 className="h5 fw-bold m-0" style={{ color: "var(--zen-text-primary, #1B4332)" }}>
            🛠️ Actions Taken ({actions.length})
          </h3>
          <span className="badge bg-light text-secondary border">
            {readOnly ? "Read-Only View" : "Technical Log"}
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            className="btn btn-zen-primary btn-sm d-inline-flex align-items-center gap-1"
            onClick={handleOpenCreate}
            data-testid="add-action-taken-btn"
          >
            <span>+</span> Add Action Taken
          </button>
        )}
      </div>

      {/* Description helper banner */}
      <div
        className="p-3 mb-3 rounded-3"
        style={{
          backgroundColor: "#F4F7F5",
          borderLeft: "4px solid var(--zen-primary, #2D6A4F)",
          fontSize: "0.9rem",
        }}
      >
        <span className="text-secondary">
          {readOnly
            ? "Detailed technical actions, diagnostics, and repairs executed by the IT Support team."
            : "Document all technical actions, diagnostics, and component replacements performed on this ticket. At least one action is required before marking this ticket as Resolved."}
        </span>
      </div>

      {loading && (
        <div className="text-center py-4 text-muted">
          <div className="spinner-border spinner-border-sm me-2 text-success" role="status" />
          <span>Loading technical actions...</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}

      {/* Actions Timeline List */}
      {!loading && !error && (
        <div className="actions-timeline" data-testid="actions-taken-timeline">
          {actions.length === 0 ? (
            <div className="text-center py-4 text-muted border rounded-3 bg-light">
              <p className="mb-0 small">
                {readOnly
                  ? "No technical actions recorded yet."
                  : "No technical actions recorded yet. Click '+ Add Action Taken' to document work."}
              </p>
            </div>
          ) : (
            actions.map((act) => {
              const technicianName = act.performedBy?.name || `Technician #${act.performedById}`;
              const technicianRole = act.performedBy?.role || "IT_Staff";

              return (
                <div
                  key={act.id}
                  className="card mb-3 border-1 shadow-sm"
                  style={{ borderRadius: "8px", overflow: "hidden" }}
                  data-testid={`action-taken-card-${act.id}`}
                >
                  {/* Card Header Line */}
                  <div className="card-header bg-light d-flex flex-wrap justify-content-between align-items-center py-2 px-3 gap-2">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <span className="fw-semibold text-dark small" data-testid={`action-date-${act.id}`}>
                        📅 {formatDateTime(act.actionDateTime)}
                      </span>
                      <span className="badge bg-secondary-subtle text-secondary border small">
                        Performed by: <strong className="text-dark">{technicianName}</strong> ({technicianRole})
                      </span>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      {act.followUpRequired ? (
                        <span className="badge bg-warning text-dark border border-warning-subtle py-1 px-2">
                          ⚠️ Follow-Up Required
                        </span>
                      ) : (
                        <span className="badge bg-success-subtle text-success border border-success-subtle py-1 px-2">
                          ✓ No Follow-Up Needed
                        </span>
                      )}

                      {!readOnly && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm py-0 px-2"
                          onClick={() => handleOpenEdit(act)}
                          aria-label={`Edit Action #${act.id}`}
                          data-testid={`edit-action-btn-${act.id}`}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="card-body py-3 px-3">
                    <div className="mb-2">
                      <strong className="d-block text-secondary small text-uppercase">Action Description:</strong>
                      <p className="mb-0 text-dark" style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                        {act.description}
                      </p>
                    </div>

                    <div
                      className="p-2 mb-2 rounded"
                      style={{ backgroundColor: "#F7FAF8", borderLeft: "3px solid #2D6A4F" }}
                    >
                      <strong className="d-block text-success small text-uppercase">Result / Outcome:</strong>
                      <span className="text-dark small" style={{ whiteSpace: "pre-wrap" }}>
                        {act.result}
                      </span>
                    </div>

                    {act.followUpRequired && act.followUpNote && (
                      <div
                        className="p-2 mb-2 rounded"
                        style={{ backgroundColor: "#FFFBEA", borderLeft: "3px solid #F59E0B" }}
                      >
                        <strong className="d-block text-warning-emphasis small text-uppercase">
                          Follow-Up Details:
                        </strong>
                        <span className="text-dark small" style={{ whiteSpace: "pre-wrap" }}>
                          {act.followUpNote}
                        </span>
                      </div>
                    )}

                    {act.attachmentNotes && (
                      <div className="small text-muted d-flex align-items-center gap-1 mt-2">
                        <span>📎 Reference / Files:</span>
                        <span className="fst-italic">{act.attachmentNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal / Form Drawer (Visible only to Staff / Admin) */}
      {!readOnly && isModalOpen && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold" id="action-modal-title">
                  {editingActionId !== null
                    ? `Edit Action Taken #${editingActionId}`
                    : "Record Action Taken"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  aria-label="Close"
                  disabled={submitting}
                />
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  {submitError && (
                    <div className="alert alert-danger py-2 small mb-3" role="alert">
                      {submitError}
                    </div>
                  )}

                  {/* Row 1: Action Date/Time & Performed By */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label htmlFor="actionDateTimeInput" className="form-label fw-semibold small">
                        Action Date & Time
                      </label>
                      <input
                        id="actionDateTimeInput"
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={actionDateTime}
                        onChange={(e) => setActionDateTime(e.target.value)}
                        disabled={submitting}
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="performedBySelect" className="form-label fw-semibold small">
                        Performed By
                      </label>
                      <select
                        id="performedBySelect"
                        className="form-select form-select-sm"
                        value={performedById}
                        onChange={(e) => setPerformedById(e.target.value ? Number(e.target.value) : "")}
                        disabled={submitting}
                      >
                        {staffMembers.length > 0 ? (
                          staffMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))
                        ) : (
                          <option value="">Current Logged-in Staff</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Field: Action Description */}
                  <div className="mb-3">
                    <label htmlFor="actionDescription" className="form-label fw-semibold small">
                      Action Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="actionDescription"
                      className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
                      rows={3}
                      placeholder="Describe technical steps executed (min 5 characters)..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={submitting}
                    />
                    {fieldErrors.description && (
                      <div className="invalid-feedback">{fieldErrors.description}</div>
                    )}
                  </div>

                  {/* Field: Result / Outcome */}
                  <div className="mb-3">
                    <label htmlFor="actionResult" className="form-label fw-semibold small">
                      Result / Outcome <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="actionResult"
                      className={`form-control ${fieldErrors.result ? "is-invalid" : ""}`}
                      rows={2}
                      placeholder="What was the diagnostic outcome or fix result (min 5 characters)?"
                      value={result}
                      onChange={(e) => setResult(e.target.value)}
                      disabled={submitting}
                    />
                    {fieldErrors.result && (
                      <div className="invalid-feedback">{fieldErrors.result}</div>
                    )}
                  </div>

                  {/* Toggle: Follow-Up Required */}
                  <div className="form-check form-switch mb-3">
                    <input
                      id="followUpSwitch"
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={followUpRequired}
                      onChange={(e) => setFollowUpRequired(e.target.checked)}
                      disabled={submitting}
                    />
                    <label htmlFor="followUpSwitch" className="form-check-label fw-semibold small">
                      Follow-Up Required?
                    </label>
                  </div>

                  {/* Conditional Field: Follow-Up Note */}
                  {followUpRequired && (
                    <div className="mb-3 p-3 rounded" style={{ backgroundColor: "#FFFDF5", border: "1px solid #FCD34D" }}>
                      <label htmlFor="followUpNoteInput" className="form-label fw-semibold small text-warning-emphasis">
                        Follow-Up Note <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="followUpNoteInput"
                        className={`form-control ${fieldErrors.followUpNote ? "is-invalid" : ""}`}
                        rows={2}
                        placeholder="Specify follow-up steps, vendor ticket IDs, or pending parts (min 5 characters)..."
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        disabled={submitting}
                      />
                      {fieldErrors.followUpNote && (
                        <div className="invalid-feedback">{fieldErrors.followUpNote}</div>
                      )}
                    </div>
                  )}

                  {/* Field: Attachment Notes */}
                  <div className="mb-2">
                    <label htmlFor="attachmentNotesInput" className="form-label fw-semibold small">
                      Attachment References / Notes (Optional)
                    </label>
                    <input
                      id="attachmentNotesInput"
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Attached hardware_diag.log and multimeter_reading.png"
                      value={attachmentNotes}
                      onChange={(e) => setAttachmentNotes(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light py-2 px-4">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCloseModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-zen-primary btn-sm"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Save Action Taken"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
