import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchStaffTickets,
  fetchCategories,
  Category,
  StaffTicketItem,
  PaginationMetadata,
} from "../api.js";

interface Props {
  onSelectTicket?: (ticketId: number) => void;
}

const STATUSES = ["All", "New", "Open", "In Progress", "Pending Requester", "Resolved", "Closed"];
const PRIORITIES = ["All", "Low", "Medium", "High", "Critical"];
const ASSIGNEES = [
  { label: "All Tickets", value: "All" },
  { label: "Unassigned", value: "unassigned" },
  { label: "Assigned to Me", value: "mine" },
];

/** Priority badge styling */
function priorityBadge(priority: string) {
  switch (priority?.toLowerCase()) {
    case "critical":
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
    case "pending requester":
    case "waiting for requester":
      return { bg: "#F3E5F5", color: "#6A1B9A", border: "#E1BEE7" };
    case "resolved":
      return { bg: "#D1E7DD", color: "#0F5132", border: "#BADBCC" };
    case "closed":
      return { bg: "#E9ECEF", color: "#495057", border: "#CED4DA" };
    default:
      return { bg: "#E9ECEF", color: "#495057", border: "#CED4DA" };
  }
}

export default function StaffTicketQueue({ onSelectTicket }: Props) {
  const { token, user } = useAuth();

  // Data state
  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [assignee, setAssignee] = useState("All");
  const [categoryId, setCategoryId] = useState("All");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load categories
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Fetch staff tickets callback
  const loadStaffTickets = useCallback(
    async (targetPage: number) => {
      if (!token) return;
      setLoading(true);
      setError("");

      try {
        const res = await fetchStaffTickets(token, {
          q: debouncedSearch.trim() || undefined,
          status: status !== "All" ? status : undefined,
          priority: priority !== "All" ? priority : undefined,
          assigneeId: assignee !== "All" ? assignee : undefined,
          categoryId: categoryId !== "All" ? categoryId : undefined,
          sortBy,
          sortOrder,
          page: targetPage,
          limit,
        });

        const ticketList = res.tickets || res.items || [];
        setTickets(ticketList);

        const total = res.pagination?.total ?? res.total ?? ticketList.length;
        const totalPages = res.pagination?.totalPages ?? Math.ceil(total / limit) ?? 1;

        setPagination({
          page: res.pagination?.page ?? targetPage,
          limit: res.pagination?.limit ?? limit,
          totalCount: total,
          totalPages: Math.max(1, totalPages),
        });
      } catch (err: any) {
        setError(err.message || "Failed to load IT Staff ticket queue");
      } finally {
        setLoading(false);
      }
    },
    [token, debouncedSearch, status, priority, assignee, categoryId, sortBy, sortOrder, limit]
  );

  useEffect(() => {
    loadStaffTickets(page);
  }, [loadStaffTickets, page]);

  // Quick stats calculation
  const stats = useMemo(() => {
    const total = pagination.totalCount;
    const newCount = tickets.filter((t) => t.status.toLowerCase() === "new").length;
    const inProgressCount = tickets.filter(
      (t) => t.status.toLowerCase() === "in_progress" || t.status.toLowerCase() === "in progress"
    ).length;
    const pendingCount = tickets.filter(
      (t) =>
        t.status.toLowerCase() === "pending_requester" ||
        t.status.toLowerCase() === "pending requester"
    ).length;
    const resolvedCount = tickets.filter((t) => t.status.toLowerCase() === "resolved").length;

    return { total, newCount, inProgressCount, pendingCount, resolvedCount };
  }, [tickets, pagination.totalCount]);

  // Clear filters
  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("All");
    setPriority("All");
    setAssignee("All");
    setCategoryId("All");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search) ||
    status !== "All" ||
    priority !== "All" ||
    assignee !== "All" ||
    categoryId !== "All";

  return (
    <div className="container-fluid px-3 px-md-4 py-4" style={{ maxWidth: "1400px" }}>
      {/* Header & Title */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--zen-text)" }}>
            🎫 IT Support Queue
          </h1>
          <p className="text-muted small mb-0">
            Shared service desk queue for IT Support Staff and Administrators
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span
            className="badge rounded-pill"
            style={{
              backgroundColor: "var(--zen-pale)",
              color: "var(--zen-primary)",
              border: "1px solid var(--zen-border)",
              fontSize: "0.85rem",
              padding: "6px 14px",
            }}
          >
            {pagination.totalCount} Total Tickets
          </span>
          <button
            type="button"
            className="btn btn-sm btn-zen-outline"
            onClick={() => loadStaffTickets(page)}
            disabled={loading}
            title="Refresh Queue"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Counter Cards */}
      <div className="row g-2 g-md-3 mb-4">
        <div className="col-6 col-md">
          <div
            className="card p-3 h-100 border-0 shadow-sm"
            style={{ backgroundColor: "var(--zen-card-bg)", borderRadius: "8px" }}
          >
            <div className="text-muted small fw-semibold">Total Queue</div>
            <div className="h4 fw-bold mt-1 mb-0" style={{ color: "var(--zen-primary)" }}>
              {stats.total}
            </div>
          </div>
        </div>
        <div className="col-6 col-md">
          <div
            className="card p-3 h-100 border-0 shadow-sm"
            style={{ backgroundColor: "#E7F1FF", borderRadius: "8px" }}
          >
            <div className="small fw-semibold" style={{ color: "#0D6EFD" }}>
              New
            </div>
            <div className="h4 fw-bold mt-1 mb-0" style={{ color: "#0D6EFD" }}>
              {stats.newCount}
            </div>
          </div>
        </div>
        <div className="col-6 col-md">
          <div
            className="card p-3 h-100 border-0 shadow-sm"
            style={{ backgroundColor: "#FFF3CD", borderRadius: "8px" }}
          >
            <div className="small fw-semibold" style={{ color: "#856404" }}>
              In Progress
            </div>
            <div className="h4 fw-bold mt-1 mb-0" style={{ color: "#856404" }}>
              {stats.inProgressCount}
            </div>
          </div>
        </div>
        <div className="col-6 col-md">
          <div
            className="card p-3 h-100 border-0 shadow-sm"
            style={{ backgroundColor: "#F3E5F5", borderRadius: "8px" }}
          >
            <div className="small fw-semibold" style={{ color: "#6A1B9A" }}>
              Pending Requester
            </div>
            <div className="h4 fw-bold mt-1 mb-0" style={{ color: "#6A1B9A" }}>
              {stats.pendingCount}
            </div>
          </div>
        </div>
        <div className="col-12 col-md">
          <div
            className="card p-3 h-100 border-0 shadow-sm"
            style={{ backgroundColor: "#D1E7DD", borderRadius: "8px" }}
          >
            <div className="small fw-semibold" style={{ color: "#0F5132" }}>
              Resolved
            </div>
            <div className="h4 fw-bold mt-1 mb-0" style={{ color: "#0F5132" }}>
              {stats.resolvedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div
        className="card border shadow-sm p-3 mb-4"
        style={{
          borderColor: "var(--zen-border)",
          backgroundColor: "var(--zen-card-bg)",
          borderRadius: "8px",
        }}
      >
        <div className="row g-2 align-items-end">
          {/* Search Input */}
          <div className="col-12 col-lg-3">
            <label htmlFor="search-tickets" className="form-label small fw-semibold mb-1">
              Search
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">🔍</span>
              <input
                id="search-tickets"
                type="text"
                className="form-control border-start-0"
                placeholder="Search ticket #, title, summary..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearch("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="filter-status" className="form-label small fw-semibold mb-1">
              Status
            </label>
            <select
              id="filter-status"
              className="form-select form-select-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="filter-priority" className="form-label small fw-semibold mb-1">
              Priority
            </label>
            <select
              id="filter-priority"
              className="form-select form-select-sm"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              {PRIORITIES.map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="filter-category" className="form-label small fw-semibold mb-1">
              Category
            </label>
            <select
              id="filter-category"
              className="form-select form-select-sm"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="filter-assignee" className="form-label small fw-semibold mb-1">
              Assignee
            </label>
            <select
              id="filter-assignee"
              className="form-select form-select-sm"
              value={assignee}
              onChange={(e) => {
                setAssignee(e.target.value);
                setPage(1);
              }}
            >
              {ASSIGNEES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="col-12 col-lg-1 d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-4">
          <span>⚠️</span>
          <span>{error}</span>
          <button
            type="button"
            className="btn-close ms-auto"
            onClick={() => setError("")}
            aria-label="Close error"
          />
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading queue...</span>
          </div>
          <p className="text-muted small mt-2">Loading ticket queue...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && tickets.length === 0 && (
        <div
          className="card border text-center p-5 shadow-sm"
          style={{
            backgroundColor: "var(--zen-card-bg)",
            borderColor: "var(--zen-border)",
            borderRadius: "8px",
          }}
          data-testid="empty-queue-state"
        >
          <div style={{ fontSize: "3rem" }}>📭</div>
          <h2 className="h5 fw-bold mt-2" style={{ color: "var(--zen-text)" }}>
            No tickets found
          </h2>
          <p className="text-muted small mb-3">
            {hasActiveFilters
              ? "No tickets match your filter and search criteria. Try adjusting or clearing your filters."
              : "The support queue is currently empty. No active tickets."}
          </p>
          {hasActiveFilters && (
            <div>
              <button
                type="button"
                className="btn btn-sm btn-zen-primary"
                onClick={handleClearFilters}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Desktop & Tablet Table (Visible on md and up: >= 768px) */}
      {!loading && tickets.length > 0 && (
        <div className="d-none d-md-block">
          <div
            className="card border shadow-sm overflow-hidden mb-3"
            style={{
              borderColor: "var(--zen-border)",
              borderRadius: "8px",
              backgroundColor: "var(--zen-card-bg)",
            }}
          >
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" data-testid="staff-ticket-table">
                <thead style={{ backgroundColor: "#F8FBF9", borderBottom: "2px solid var(--zen-border)" }}>
                  <tr className="small text-muted text-uppercase">
                    <th scope="col" style={{ width: "130px" }}>
                      ID / Ticket No
                    </th>
                    <th scope="col" style={{ minWidth: "220px" }}>
                      Title
                    </th>
                    <th scope="col" style={{ minWidth: "150px" }}>
                      Requester
                    </th>
                    <th scope="col" style={{ minWidth: "110px" }}>
                      Category
                    </th>
                    <th scope="col" style={{ width: "110px" }}>
                      Status
                    </th>
                    <th scope="col" style={{ width: "100px" }}>
                      Priority
                    </th>
                    <th scope="col" style={{ minWidth: "140px" }}>
                      Assignee
                    </th>
                    <th scope="col" style={{ minWidth: "110px" }}>
                      Created At
                    </th>
                    <th scope="col" className="text-end" style={{ width: "100px" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => {
                    const stStyle = statusBadge(t.status);
                    const prStyle = priorityBadge(t.itPriority || t.priority);
                    const assigneeName = t.assignedTo?.name || t.owner?.name || t.assignee?.name;

                    return (
                      <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => onSelectTicket?.(t.id)}>
                        {/* ID / Ticket Number */}
                        <td>
                          <span
                            className="font-monospace fw-semibold"
                            style={{ color: "var(--zen-primary)", fontSize: "0.85rem" }}
                          >
                            {t.ticketNumber}
                          </span>
                        </td>

                        {/* Title / Summary */}
                        <td>
                          <div className="fw-semibold text-truncate" style={{ maxWidth: "280px" }} title={t.summary}>
                            {t.summary}
                          </div>
                          {t._count && (
                            <div className="text-muted small mt-1 d-flex gap-2">
                              {t._count.attachments > 0 && <span>📎 {t._count.attachments}</span>}
                              {t._count.publicComments > 0 && <span>💬 {t._count.publicComments}</span>}
                              {t._count.internalNotes > 0 && <span>🔒 {t._count.internalNotes}</span>}
                            </div>
                          )}
                        </td>

                        {/* Requester */}
                        <td>
                          <div className="small fw-semibold">{t.requester?.name || "Requester"}</div>
                          <div className="text-muted small text-truncate" style={{ maxWidth: "160px" }}>
                            {t.requester?.email}
                          </div>
                        </td>

                        {/* Category */}
                        <td>
                          <span className="badge bg-light text-dark border">{t.category?.name}</span>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: stStyle.bg,
                              color: stStyle.color,
                              border: `1px solid ${stStyle.border}`,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              padding: "4px 8px",
                            }}
                          >
                            {t.status.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* Priority */}
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: prStyle.bg,
                              color: prStyle.color,
                              border: `1px solid ${prStyle.border}`,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              padding: "4px 8px",
                            }}
                          >
                            {t.itPriority ? `IT: ${t.itPriority}` : t.priority}
                          </span>
                        </td>

                        {/* Assignee / Owner */}
                        <td>
                          {assigneeName ? (
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "#EAF2FC",
                                color: "#1A569E",
                                border: "1px solid #BFD8F8",
                              }}
                            >
                              👤 {assigneeName}
                            </span>
                          ) : (
                            <span className="text-muted fst-italic small">Unassigned</span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="small text-muted">
                          {new Date(t.createdAt || t.ticketDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="text-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-sm btn-zen-outline"
                            onClick={() => onSelectTicket?.(t.id)}
                          >
                            Open Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Card Layout (Visible on screens < 768px: zero horizontal scroll) */}
      {!loading && tickets.length > 0 && (
        <div className="d-md-none" data-testid="staff-ticket-cards">
          <div className="d-flex flex-column gap-3 mb-3">
            {tickets.map((t) => {
              const stStyle = statusBadge(t.status);
              const prStyle = priorityBadge(t.itPriority || t.priority);
              const assigneeName = t.assignedTo?.name || t.owner?.name || t.assignee?.name;

              return (
                <div
                  key={t.id}
                  className="card border shadow-sm p-3"
                  style={{
                    backgroundColor: "var(--zen-card-bg)",
                    borderColor: "var(--zen-border)",
                    borderRadius: "8px",
                  }}
                  onClick={() => onSelectTicket?.(t.id)}
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span
                      className="font-monospace fw-bold"
                      style={{ color: "var(--zen-primary)", fontSize: "0.9rem" }}
                    >
                      {t.ticketNumber}
                    </span>
                    <div className="d-flex gap-1">
                      <span
                        className="badge"
                        style={{
                          backgroundColor: stStyle.bg,
                          color: stStyle.color,
                          border: `1px solid ${stStyle.border}`,
                          fontSize: "0.7rem",
                        }}
                      >
                        {t.status.replace(/_/g, " ")}
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: prStyle.bg,
                          color: prStyle.color,
                          border: `1px solid ${prStyle.border}`,
                          fontSize: "0.7rem",
                        }}
                      >
                        {t.itPriority ? `IT: ${t.itPriority}` : t.priority}
                      </span>
                    </div>
                  </div>

                  <h3 className="h6 fw-bold mb-1" style={{ color: "var(--zen-text)" }}>
                    {t.summary}
                  </h3>

                  <div className="small text-muted mb-2">
                    <span>Requester: </span>
                    <span className="fw-semibold text-dark">{t.requester?.name || "Requester"}</span>
                    {" • "}
                    <span>{t.category?.name}</span>
                  </div>

                  <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-2">
                    <div className="small">
                      {assigneeName ? (
                        <span className="text-primary fw-semibold">👤 {assigneeName}</span>
                      ) : (
                        <span className="text-muted fst-italic">Unassigned</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-zen-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTicket?.(t.id);
                      }}
                    >
                      Open Detail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {!loading && tickets.length > 0 && (
        <div
          className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 card border shadow-sm"
          style={{
            borderColor: "var(--zen-border)",
            backgroundColor: "var(--zen-card-bg)",
            borderRadius: "8px",
          }}
          data-testid="queue-pagination"
        >
          <div className="small text-muted" data-testid="pagination-info">
            Page {pagination.page} of {pagination.totalPages} (Total {pagination.totalCount} tickets)
          </div>

          <div className="d-flex align-items-center gap-2">
            <label htmlFor="queue-page-size" className="small text-muted mb-0">
              Rows:
            </label>
            <select
              id="queue-page-size"
              className="form-select form-select-sm"
              style={{ width: "70px" }}
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>

            <nav aria-label="Ticket queue pagination">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pagination.page <= 1 ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    aria-label="Previous Page"
                  >
                    Previous
                  </button>
                </li>
                <li className={`page-item ${pagination.page >= pagination.totalPages ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    aria-label="Next Page"
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
