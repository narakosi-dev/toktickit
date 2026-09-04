import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  Category,
  RelatedSystem,
  Ticket,
} from "../api.js";

interface Props {
  onTicketCreated?: () => void;
}

interface FormErrors {
  categoryId?: string;
  relatedSystemId?: string;
  priority?: string;
  summary?: string;
  description?: string;
}

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export default function CreateTicket({ onTicketCreated }: Props) {
  const { requester } = useRequester();

  // Form field state
  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [priority, setPriority] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  // Load reference data on mount
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});
    fetchRelatedSystems()
      .then(setSystems)
      .catch(() => {});
  }, []);

  // Client-side validation
  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (!categoryId) {
      errs.categoryId = "Category is required";
    }
    if (!relatedSystemId) {
      errs.relatedSystemId = "Related System is required";
    }
    if (!priority) {
      errs.priority = "Priority is required";
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      errs.summary = "Summary is required";
    } else if (trimmedSummary.length < 5) {
      errs.summary = "Summary must be at least 5 characters";
    } else if (trimmedSummary.length > 120) {
      errs.summary = "Summary must not exceed 120 characters";
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      errs.description = "Description is required";
    } else if (trimmedDesc.length < 10) {
      errs.description = "Description must be at least 10 characters";
    } else if (trimmedDesc.length > 2000) {
      errs.description = "Description must not exceed 2000 characters";
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    // Client-side validation (AC-05)
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!requester) return;

    setSubmitState("submitting");

    try {
      const ticket = await createTicket({
        requesterId: requester.id,
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        priority,
        summary: summary.trim(),
        description: description.trim(),
      });
      setCreatedTicket(ticket);
      setSubmitState("success");
    } catch (err: any) {
      // AC-06: Error resilience — preserve form inputs
      setServerError(err.message || "An unexpected error occurred. Please try again.");
      setSubmitState("error");
    }
  }

  // Success view
  if (submitState === "success" && createdTicket) {
    return (
      <div className="zen-card p-4 text-center">
        <div
          className="mb-3"
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            backgroundColor: "var(--zen-pale)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            fontSize: "1.75rem",
          }}
        >
          ✅
        </div>
        <h2 className="h4 fw-bold mb-2">Ticket Created Successfully</h2>
        <p className="text-muted mb-3">Your IT support ticket has been submitted.</p>

        <div className="zen-card p-3 mb-4" style={{ maxWidth: 400, margin: "0 auto", backgroundColor: "var(--zen-pale)" }}>
          <div className="mb-2">
            <span className="text-muted small">Ticket Number</span>
            <div className="fw-bold fs-5" data-testid="created-ticket-number" style={{ color: "var(--zen-primary)" }}>
              {createdTicket.ticketNumber}
            </div>
          </div>
          <div className="mb-2">
            <span className="text-muted small">Status</span>
            <div>
              <span className="badge badge-zen-new">{createdTicket.status}</span>
            </div>
          </div>
          <div>
            <span className="text-muted small">Summary</span>
            <div className="fw-semibold">{createdTicket.summary}</div>
          </div>
        </div>

        <div className="d-flex justify-content-center gap-3">
          <button
            type="button"
            className="btn btn-zen-primary"
            onClick={onTicketCreated}
          >
            View My Tickets
          </button>
          <button
            type="button"
            className="btn btn-zen-secondary"
            onClick={() => {
              setSubmitState("idle");
              setCreatedTicket(null);
              setCategoryId("");
              setRelatedSystemId("");
              setPriority("");
              setSummary("");
              setDescription("");
              setErrors({});
            }}
          >
            Create Another Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="zen-card p-4">
      <h2 className="h4 fw-bold mb-4">Create IT Support Ticket</h2>

      {/* Server error banner — AC-06 */}
      {submitState === "error" && serverError && (
        <div className="alert py-2 mb-4" role="alert" style={{ backgroundColor: "var(--zen-danger-bg)", color: "var(--zen-danger)", border: "1px solid var(--zen-danger)" }}>
          <strong>⚠ Submission Failed:</strong> {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Row 1: Classification fields — 2-column on desktop */}
        <div className="row g-3 mb-3">
          {/* Category */}
          <div className="col-md-4">
            <label htmlFor="category" className="form-label">
              Category <span className="required-asterisk">*</span>
            </label>
            <select
              id="category"
              className={`form-select ${errors.categoryId ? "is-invalid" : ""}`}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: undefined }));
              }}
              data-testid="category-select"
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <div className="invalid-feedback">{errors.categoryId}</div>}
          </div>

          {/* Related System */}
          <div className="col-md-4">
            <label htmlFor="relatedSystem" className="form-label">
              Related System <span className="required-asterisk">*</span>
            </label>
            <select
              id="relatedSystem"
              className={`form-select ${errors.relatedSystemId ? "is-invalid" : ""}`}
              value={relatedSystemId}
              onChange={(e) => {
                setRelatedSystemId(e.target.value);
                if (errors.relatedSystemId) setErrors((prev) => ({ ...prev, relatedSystemId: undefined }));
              }}
              data-testid="system-select"
            >
              <option value="">Select system...</option>
              {systems.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.name}
                </option>
              ))}
            </select>
            {errors.relatedSystemId && <div className="invalid-feedback">{errors.relatedSystemId}</div>}
          </div>

          {/* Priority */}
          <div className="col-md-4">
            <label htmlFor="priority" className="form-label">
              Requested Priority <span className="required-asterisk">*</span>
            </label>
            <select
              id="priority"
              className={`form-select ${errors.priority ? "is-invalid" : ""}`}
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                if (errors.priority) setErrors((prev) => ({ ...prev, priority: undefined }));
              }}
              data-testid="priority-select"
            >
              <option value="">Select priority...</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {errors.priority && <div className="invalid-feedback">{errors.priority}</div>}
          </div>
        </div>

        {/* Summary */}
        <div className="mb-3">
          <label htmlFor="summary" className="form-label">
            Summary <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="summary"
            className={`form-control ${errors.summary ? "is-invalid" : ""}`}
            placeholder="Brief summary of the issue (5–120 characters)"
            maxLength={120}
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              if (errors.summary) setErrors((prev) => ({ ...prev, summary: undefined }));
            }}
            data-testid="summary-input"
          />
          {errors.summary && <div className="invalid-feedback">{errors.summary}</div>}
          <div className="form-text text-end">{summary.trim().length}/120</div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label htmlFor="description" className="form-label">
            Description <span className="required-asterisk">*</span>
          </label>
          <textarea
            id="description"
            className={`form-control ${errors.description ? "is-invalid" : ""}`}
            placeholder="Detailed description of the issue (10–2000 characters)"
            rows={5}
            maxLength={2000}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            style={{ minHeight: 120, resize: "vertical" }}
            data-testid="description-input"
          />
          {errors.description && <div className="invalid-feedback">{errors.description}</div>}
          <div className="form-text text-end">{description.trim().length}/2000</div>
        </div>

        {/* Submit */}
        <div className="d-flex justify-content-end gap-3">
          <button
            type="submit"
            className="btn btn-zen-primary"
            disabled={submitState === "submitting"}
            data-testid="submit-ticket-btn"
          >
            {submitState === "submitting" ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              "Submit Ticket"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
