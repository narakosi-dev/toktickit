import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchRequesterDashboard,
  RequesterDashboardResponse,
  RequesterRecentTicketItem,
} from "../api.js";

interface Props {
  onNavigateToCreate?: () => void;
  onNavigateToMyTickets?: (filter?: { status?: string }) => void;
  onSelectTicket?: (ticketId: number) => void;
}

/** Priority badge styling */
function priorityBadge(priority: string) {
  switch (priority?.toLowerCase()) {
    case "critical":
    case "urgent":
      return { bg: "#F8D7DA", color: "#842029", border: "#F5C2C7" };
    case "high":
      return { bg: "#FFE5D0", color: "#C05621", border: "#FBD38D" };
    case "medium":
      return { bg: "#FFF3CD", color: "#856404", border: "#FFE69C" };
    case "low":
    default:
      return { bg: "#D1E7DD", color: "#0F5132", border: "#BADBCC" };
  }
}

/** Status badge styling */
function statusBadge(status: string) {
  const norm = status?.toLowerCase().replace(/_/g, " ");
  switch (norm) {
    case "new":
      return { bg: "#E7F1FF", color: "#0D6EFD", border: "#B6D4FE" };
    case "open":
      return { bg: "#E0F7FA", color: "#00838F", border: "#B2EBF2" };
    case "in progress":
      return { bg: "#FFF3CD", color: "#856404", border: "#FFE69C" };
    case "waiting for requester":
    case "pending requester":
      return { bg: "#F3E5F5", color: "#6A1B9A", border: "#E1BEE7" };
    case "resolved":
      return { bg: "#D1E7DD", color: "#0F5132", border: "#BADBCC" };
    case "closed":
      return { bg: "#E9ECEF", color: "#495057", border: "#CED4DA" };
    case "cancelled":
      return { bg: "#F8D7DA", color: "#721C24", border: "#F5C6CB" };
    default:
      return { bg: "#E9ECEF", color: "#495057", border: "#CED4DA" };
  }
}

function formatDate(isoStr: string) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

export default function RequesterDashboard({
  onNavigateToCreate,
  onNavigateToMyTickets,
  onSelectTicket,
}: Props) {
  const { user, token } = useAuth();
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchRequesterDashboard(token);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load personal dashboard metrics");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = data?.metrics;
  const totalOpen = metrics?.totalOpen ?? 0;
  const inProgress = metrics?.inProgress ?? 0;
  const recentlyResolved = metrics?.recentlyResolved ?? 0;
  const closed = metrics?.closed ?? metrics?.closedCount ?? 0;

  return (
    <div className="requester-dashboard" data-testid="requester-dashboard">
      {/* 1. Header Area */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
            Welcome, {user?.name || "Requester"}!
          </h1>
          <p className="text-muted mb-0 small">
            Here's the latest update on your support requests.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {data?.generatedAt && (
            <span className="text-muted small d-none d-md-inline">
              Updated: {formatDate(data.generatedAt)}
            </span>
          )}
          <button
            type="button"
            className="btn btn-zen-outline-primary btn-sm d-flex align-items-center gap-1"
            onClick={loadDashboard}
            disabled={loading}
            aria-label="Refresh dashboard data"
          >
            <span className={loading ? "spinner-border spinner-border-sm" : ""}>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4" role="alert">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={loadDashboard}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && !data && (
        <div className="text-center py-5" aria-live="polite">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading personal dashboard…</span>
          </div>
          <p className="mt-2 text-muted small">Loading your ticket summary…</p>
        </div>
      )}

      {data && (
        <>
          {/* 2. Metric Cards Grid: 4 focused cards */}
          <section className="mb-4" aria-label="Personal Ticket Metrics">
            <div className="row g-3">
              {/* Card 1: My Open Tickets */}
              <div className="col-12 col-sm-6 col-md-3">
                <div
                  className="zen-card p-3 h-100 text-decoration-none d-flex flex-column justify-content-between cursor-pointer"
                  style={{
                    borderLeft: "4px solid #3182CE",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onClick={() => onNavigateToMyTickets?.({ status: "open" })}
                  data-testid="metric-card-open"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onNavigateToMyTickets?.({ status: "open" })}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4A5568" }}>
                      My Open Tickets
                    </span>
                    <span style={{ fontSize: "1rem" }}>📋</span>
                  </div>
                  <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
                    {totalOpen}
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: "0.75rem" }}>
                    <span>Active requests</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Card 2: In Progress */}
              <div className="col-12 col-sm-6 col-md-3">
                <div
                  className="zen-card p-3 h-100 text-decoration-none d-flex flex-column justify-content-between cursor-pointer"
                  style={{
                    borderLeft: "4px solid #805AD5",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onClick={() => onNavigateToMyTickets?.({ status: "In_Progress" })}
                  data-testid="metric-card-in-progress"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onNavigateToMyTickets?.({ status: "In_Progress" })}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4A5568" }}>
                      In Progress
                    </span>
                    <span style={{ fontSize: "1rem" }}>⚙️</span>
                  </div>
                  <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
                    {inProgress}
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: "0.75rem" }}>
                    <span>Under technician review</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Resolved */}
              <div className="col-12 col-sm-6 col-md-3">
                <div
                  className="zen-card p-3 h-100 text-decoration-none d-flex flex-column justify-content-between cursor-pointer"
                  style={{
                    borderLeft: "4px solid #38A169",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onClick={() => onNavigateToMyTickets?.({ status: "Resolved" })}
                  data-testid="metric-card-resolved"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onNavigateToMyTickets?.({ status: "Resolved" })}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4A5568" }}>
                      Recently Resolved
                    </span>
                    <span style={{ fontSize: "1rem" }}>✅</span>
                  </div>
                  <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
                    {recentlyResolved}
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: "0.75rem" }}>
                    <span>Past 30 days</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Closed */}
              <div className="col-12 col-sm-6 col-md-3">
                <div
                  className="zen-card p-3 h-100 text-decoration-none d-flex flex-column justify-content-between cursor-pointer"
                  style={{
                    borderLeft: "4px solid #718096",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onClick={() => onNavigateToMyTickets?.({ status: "Closed" })}
                  data-testid="metric-card-closed"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onNavigateToMyTickets?.({ status: "Closed" })}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4A5568" }}>
                      Closed
                    </span>
                    <span style={{ fontSize: "1rem" }}>📁</span>
                  </div>
                  <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
                    {closed}
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: "0.75rem" }}>
                    <span>Completed history</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Main Content: Recent Tickets & Quick Actions */}
          <div className="row g-4">
            {/* Left Column: Recent Tickets List */}
            <div className="col-12 col-lg-8">
              <div className="zen-card p-4 h-100">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                  <h2 className="h5 fw-bold m-0" style={{ color: "var(--zen-dark)" }}>
                    Recent Support Requests
                  </h2>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: "var(--zen-primary)" }}
                    onClick={() => onNavigateToMyTickets?.({ status: "open" })}
                  >
                    View all my tickets →
                  </button>
                </div>

                {!data.recentTickets || data.recentTickets.length === 0 ? (
                  <div className="text-center py-5 text-muted" data-testid="empty-recent-tickets">
                    <span style={{ fontSize: "2.5rem" }}>📭</span>
                    <h3 className="h6 fw-semibold mt-2 mb-1" style={{ color: "var(--zen-dark)" }}>
                      No support tickets yet
                    </h3>
                    <p className="small mb-3">
                      Need technical help? Submit a request to the IT service desk.
                    </p>
                    <button
                      type="button"
                      className="btn btn-zen-primary btn-sm"
                      onClick={() => onNavigateToCreate?.()}
                    >
                      ➕ Create your first ticket
                    </button>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2" data-testid="recent-tickets-list">
                    {data.recentTickets.map((t: RequesterRecentTicketItem) => {
                      const pStyle = priorityBadge(t.priority);
                      const sStyle = statusBadge(t.status);
                      return (
                        <div
                          key={t.id}
                          className="d-flex flex-wrap justify-content-between align-items-center p-3 rounded border hover-shadow"
                          style={{
                            cursor: "pointer",
                            backgroundColor: "#FFFFFF",
                            borderColor: "var(--zen-border)",
                          }}
                          onClick={() => onSelectTicket?.(t.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === "Enter" && onSelectTicket?.(t.id)}
                          data-testid={`requester-ticket-${t.id}`}
                        >
                          <div className="me-3" style={{ maxWidth: "70%" }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className="badge bg-light text-dark border font-monospace small">
                                {t.ticketNumber}
                              </span>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: pStyle.bg,
                                  color: pStyle.color,
                                  border: `1px solid ${pStyle.border}`,
                                }}
                              >
                                {t.priority}
                              </span>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: sStyle.bg,
                                  color: sStyle.color,
                                  border: `1px solid ${sStyle.border}`,
                                }}
                              >
                                {t.status.replace(/_/g, " ")}
                              </span>
                              {t.resolvedIndicated && (
                                <span className="badge bg-success-subtle text-success border border-success-subtle small">
                                  ✓ Resolution Indicated
                                </span>
                              )}
                            </div>
                            <div className="fw-semibold text-truncate" title={t.summary} style={{ color: "var(--zen-dark)" }}>
                              {t.summary}
                            </div>
                            <div className="text-muted small mt-1">
                              Category: {t.category?.name || "General"}
                            </div>
                          </div>
                          <div className="text-end text-muted small">
                            <div>Updated</div>
                            <div>{formatDate(t.updatedAt)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Quick Actions & Help Tips */}
            <div className="col-12 col-lg-4 d-flex flex-column gap-4">
              {/* Quick Actions Card */}
              <div className="zen-card p-4">
                <h3 className="h6 fw-bold mb-3 text-uppercase" style={{ color: "var(--zen-dark)", letterSpacing: "0.5px" }}>
                  ⚡ Quick Actions
                </h3>
                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="btn btn-zen-primary text-start d-flex align-items-center gap-2 py-2"
                    onClick={() => onNavigateToCreate?.()}
                    data-testid="quick-action-create"
                  >
                    <span>➕</span>
                    <span>Create New Ticket</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-zen-outline-primary text-start d-flex align-items-center gap-2 py-2"
                    onClick={() => onNavigateToMyTickets?.({ status: "open" })}
                    data-testid="quick-action-view-tickets"
                  >
                    <span>📂</span>
                    <span>View All My Tickets</span>
                  </button>
                </div>
              </div>

              {/* Service Desk Notice / Help */}
              <div className="zen-card p-4" style={{ backgroundColor: "var(--zen-light-bg)" }}>
                <h3 className="h6 fw-bold mb-2 d-flex align-items-center gap-2" style={{ color: "var(--zen-dark)" }}>
                  <span>ℹ️</span>
                  <span>Need Immediate Help?</span>
                </h3>
                <p className="small text-muted mb-2">
                  For urgent network or equipment outages during business hours (8:00 AM – 5:00 PM), please mark priority as <strong>Critical</strong>.
                </p>
                <div className="small fw-semibold" style={{ color: "var(--zen-primary)" }}>
                  IT Helpdesk Hotline: Ext. 5052
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
