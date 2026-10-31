import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchStaffDashboard,
  StaffDashboardResponse,
  UrgentTicketItem,
  RecentUpdatedTicketItem,
} from "../api.js";

interface Props {
  onNavigateToQueue?: (filter?: { status?: string; assignee?: string }) => void;
  onNavigateToCreate?: () => void;
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
    case "reopened":
      return { bg: "#FFF3E0", color: "#E65100", border: "#FFE0B2" };
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

export default function StaffDashboard({
  onNavigateToQueue,
  onNavigateToCreate,
  onSelectTicket,
}: Props) {
  const { user, token } = useAuth();
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticketTab, setTicketTab] = useState<"urgent" | "recent">("urgent");

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchStaffDashboard(token);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = data?.metrics;
  const statusCounts = metrics?.statusBreakdown || metrics?.statusCounts || {};
  const priorityCounts = metrics?.priorityBreakdown || metrics?.priorityCounts || {};

  const newCount = statusCounts["New"] ?? 0;
  const openCount = statusCounts["Open"] ?? 0;
  const inProgressCount = statusCounts["In_Progress"] ?? 0;
  const waitingCount = statusCounts["Waiting_for_Requester"] ?? statusCounts["Pending_Requester"] ?? 0;
  const myAssigned = metrics?.myAssignedCount ?? 0;
  const unassigned = metrics?.unassignedCount ?? 0;

  return (
    <div className="staff-dashboard" data-testid="staff-dashboard">
      {/* 1. Header & Welcome Area */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
            Welcome back, {user?.name || "Technician"}!
          </h1>
          <p className="text-muted mb-0 small">
            Here's what's happening across your support queue today.
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

      {/* Error Feedback */}
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

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="text-center py-5" aria-live="polite">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading dashboard…</span>
          </div>
          <p className="mt-2 text-muted small">Loading operational metrics…</p>
        </div>
      )}

      {data && (
        <>
          {/* 2. Metrics Banner: 5 concise metric cards */}
          <section className="mb-4" aria-label="Operational Metrics Summary">
            <div className="row g-3">
              {/* Card 1: New */}
              <div className="col-12 col-sm-6 col-md-4 col-lg">
                <div
                  className="zen-card p-3 h-100 text-decoration-none d-flex flex-column justify-content-between cursor-pointer"
                  style={{
                    borderLeft: "4px solid #3182CE",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onClick={() => onNavigateToQueue?.({ status: "New" })}
                  data-testid="metric-card-new"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onNavigateToQueue?.({ status: "New" })}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4A5568" }}>
                      New
                    </span>
                    <span style={{ fontSize: "1rem" }}>🆕</span>
                  </div>
                  <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
                    {newCount}
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: "0.75rem" }}>
                    <span>Pending triage</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Open */}
              <div className="col-12 col-sm-6 col-md-4 col-lg">
                <div
                  className="zen-card p-3 h-100 text-decoration-none d-flex flex-column justify-content-between cursor-pointer"
                  style={{
                    borderLeft: "4px solid #DD6B20",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onClick={() => onNavigateToQueue?.({ status: "Open" })}
                  data-testid="metric-card-open"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onNavigateToQueue?.({ status: "Open" })}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4A5568" }}>
                      Open
                    </span>
                    <span style={{ fontSize: "1rem" }}>📂</span>
                  </div>
                  <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
                    {openCount}
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: "0.75rem" }}>
                    <span>Awaiting work</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Card 3: In Progress */}
              <div className="col-12 col-sm-6 col-md-4 col-lg">
                <div
                  className="zen-card p-3 h-100 text-decoration-none d-flex flex-column justify-content-between cursor-pointer"
                  style={{
                    borderLeft: "4px solid #805AD5",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onClick={() => onNavigateToQueue?.({ status: "In_Progress" })}
                  data-testid="metric-card-in-progress"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onNavigateToQueue?.({ status: "In_Progress" })}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4A5568" }}>
                      In Progress
                    </span>
                    <span style={{ fontSize: "1rem" }}>⚙️</span>
                  </div>
                  <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
                    {inProgressCount}
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: "0.75rem" }}>
                    <span>Active diagnosis</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Waiting for Requester */}
              <div className="col-12 col-sm-6 col-md-4 col-lg">
                <div
                  className="zen-card p-3 h-100 text-decoration-none d-flex flex-column justify-content-between cursor-pointer"
                  style={{
                    borderLeft: "4px solid #D69E2E",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onClick={() => onNavigateToQueue?.({ status: "Waiting_for_Requester" })}
                  data-testid="metric-card-waiting"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onNavigateToQueue?.({ status: "Waiting_for_Requester" })}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4A5568" }}>
                      Waiting Req.
                    </span>
                    <span style={{ fontSize: "1rem" }}>⏳</span>
                  </div>
                  <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
                    {waitingCount}
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: "0.75rem" }}>
                    <span>Blocked on client</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Card 5: My Assigned */}
              <div className="col-12 col-sm-6 col-md-4 col-lg">
                <div
                  className="zen-card p-3 h-100 text-decoration-none d-flex flex-column justify-content-between cursor-pointer"
                  style={{
                    borderLeft: "4px solid var(--zen-primary)",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onClick={() => onNavigateToQueue?.({ assignee: "mine", status: "active" })}
                  data-testid="metric-card-my-assigned"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onNavigateToQueue?.({ assignee: "mine", status: "active" })}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4A5568" }}>
                      My Assigned
                    </span>
                    <span style={{ fontSize: "1rem" }}>👤</span>
                  </div>
                  <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
                    {myAssigned}
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: "0.75rem" }}>
                    <span>{unassigned} unassigned in queue</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Main Two-Column Layout */}
          <div className="row g-4">
            {/* Left Column: Urgent & Recent Tickets */}
            <div className="col-12 col-lg-8">
              <div className="zen-card p-4 h-100">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <h2 className="h5 fw-bold m-0" style={{ color: "var(--zen-dark)" }}>
                      Operational Highlights
                    </h2>
                    <div className="btn-group btn-group-sm" role="group" aria-label="Ticket Highlights Toggle">
                      <button
                        type="button"
                        className={`btn ${ticketTab === "urgent" ? "btn-zen-primary" : "btn-zen-outline-secondary"}`}
                        onClick={() => setTicketTab("urgent")}
                        data-testid="tab-urgent"
                      >
                        🔥 Urgent ({data.urgentTickets?.length ?? 0})
                      </button>
                      <button
                        type="button"
                        className={`btn ${ticketTab === "recent" ? "btn-zen-primary" : "btn-zen-outline-secondary"}`}
                        onClick={() => setTicketTab("recent")}
                        data-testid="tab-recent"
                      >
                        🕒 Recent ({data.recentUpdatedTickets?.length ?? 0})
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: "var(--zen-primary)" }}
                    onClick={() => onNavigateToQueue?.()}
                  >
                    View entire queue →
                  </button>
                </div>

                {/* Urgent Tickets List */}
                {ticketTab === "urgent" && (
                  <div className="urgent-tickets-list" data-testid="urgent-tickets-list">
                    {!data.urgentTickets || data.urgentTickets.length === 0 ? (
                      <div className="text-center py-4 text-muted">
                        <span style={{ fontSize: "2rem" }}>🎉</span>
                        <p className="mb-0 mt-2">Zero critical tickets currently active. Queue is healthy!</p>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {data.urgentTickets.map((t: UrgentTicketItem) => {
                          const pStyle = priorityBadge(t.itPriority || t.priority);
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
                              data-testid={`urgent-ticket-${t.id}`}
                            >
                              <div className="me-3" style={{ maxWidth: "65%" }}>
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
                                    {t.itPriority || t.priority}
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
                                </div>
                                <div className="fw-semibold text-truncate" title={t.summary} style={{ color: "var(--zen-dark)" }}>
                                  {t.summary}
                                </div>
                                <div className="text-muted small mt-1">
                                  Requester: {t.requester?.name || "Unknown"} • Assigned: {t.assignedTo?.name || "Unassigned"}
                                </div>
                              </div>
                              <div className="text-end text-muted small">
                                <div>Created</div>
                                <div>{formatDate(t.createdAt)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Recently Updated Tickets List */}
                {ticketTab === "recent" && (
                  <div className="recent-tickets-list" data-testid="recent-tickets-list">
                    {!data.recentUpdatedTickets || data.recentUpdatedTickets.length === 0 ? (
                      <div className="text-center py-4 text-muted">
                        <p className="mb-0">No recent ticket updates.</p>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {data.recentUpdatedTickets.map((t: RecentUpdatedTicketItem) => {
                          const pStyle = priorityBadge(t.itPriority || t.priority);
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
                              data-testid={`recent-ticket-${t.id}`}
                            >
                              <div className="me-3" style={{ maxWidth: "65%" }}>
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
                                    {t.itPriority || t.priority}
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
                                </div>
                                <div className="fw-semibold text-truncate" title={t.summary} style={{ color: "var(--zen-dark)" }}>
                                  {t.summary}
                                </div>
                                <div className="text-muted small mt-1">
                                  Requester: {t.requester?.name || "Unknown"} • Assigned: {t.assignedTo?.name || "Unassigned"}
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
                )}
              </div>
            </div>

            {/* Right Column: Quick Actions & Priority Breakdown */}
            <div className="col-12 col-lg-4 d-flex flex-column gap-4">
              {/* Quick Actions Panel */}
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
                    <span>Create Ticket</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-zen-outline-primary text-start d-flex align-items-center gap-2 py-2"
                    onClick={() => onNavigateToQueue?.({ assignee: "mine", status: "active" })}
                    data-testid="quick-action-my-queue"
                  >
                    <span>👤</span>
                    <span>My Assigned Queue ({myAssigned})</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-zen-outline-primary text-start d-flex align-items-center gap-2 py-2"
                    onClick={() => onNavigateToQueue?.({ status: "All" })}
                    data-testid="quick-action-all-tickets"
                  >
                    <span>📋</span>
                    <span>All Queue Tickets</span>
                  </button>
                </div>
              </div>

              {/* Priority Breakdown Widget */}
              <div className="zen-card p-4">
                <h3 className="h6 fw-bold mb-3 text-uppercase" style={{ color: "var(--zen-dark)", letterSpacing: "0.5px" }}>
                  📊 Active Priority Distribution
                </h3>
                <div className="d-flex flex-column gap-3">
                  {/* Critical */}
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1 small fw-semibold">
                      <span className="text-danger">Critical</span>
                      <span>{priorityCounts["Critical"] ?? 0}</span>
                    </div>
                    <div className="progress" style={{ height: "6px" }}>
                      <div
                        className="progress-bar bg-danger"
                        role="progressbar"
                        style={{
                          width: `${Math.min(100, (priorityCounts["Critical"] ?? 0) * 20)}%`,
                        }}
                        aria-valuenow={priorityCounts["Critical"] ?? 0}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>

                  {/* High */}
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1 small fw-semibold">
                      <span style={{ color: "#C05621" }}>High</span>
                      <span>{priorityCounts["High"] ?? 0}</span>
                    </div>
                    <div className="progress" style={{ height: "6px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          backgroundColor: "#DD6B20",
                          width: `${Math.min(100, (priorityCounts["High"] ?? 0) * 15)}%`,
                        }}
                        aria-valuenow={priorityCounts["High"] ?? 0}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>

                  {/* Medium */}
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1 small fw-semibold">
                      <span style={{ color: "#856404" }}>Medium</span>
                      <span>{priorityCounts["Medium"] ?? 0}</span>
                    </div>
                    <div className="progress" style={{ height: "6px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          backgroundColor: "#D69E2E",
                          width: `${Math.min(100, (priorityCounts["Medium"] ?? 0) * 10)}%`,
                        }}
                        aria-valuenow={priorityCounts["Medium"] ?? 0}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>

                  {/* Low */}
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1 small fw-semibold">
                      <span className="text-success">Low</span>
                      <span>{priorityCounts["Low"] ?? 0}</span>
                    </div>
                    <div className="progress" style={{ height: "6px" }}>
                      <div
                        className="progress-bar bg-success"
                        role="progressbar"
                        style={{
                          width: `${Math.min(100, (priorityCounts["Low"] ?? 0) * 10)}%`,
                        }}
                        aria-valuenow={priorityCounts["Low"] ?? 0}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
