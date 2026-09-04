import React, { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  fetchTickets,
  fetchCategories,
  Category,
  TicketListItem,
  PaginationMetadata,
} from "../api.js";

interface Props {
  onNavigateToCreate?: () => void;
  onSelectTicket?: (ticketId: number) => void;
}

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const STATUSES = ["New", "In Progress", "Resolved"];

export default function MyTickets({ onNavigateToCreate, onSelectTicket }: Props) {
  const { requester } = useRequester();

  // Data state
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 8,
    totalCount: 0,
    totalPages: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters state
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Load categories on mount
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Fetch tickets callback
  const loadTickets = useCallback(
    async (pageToLoad: number) => {
      if (!requester) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetchTickets({
          requesterId: requester.id,
          search: search.trim() || undefined,
          categoryId: categoryId || undefined,
          priority: priority || undefined,
          status: status || undefined,
          page: pageToLoad,
          limit: 8,
        });
        setTickets(res.tickets);
        setPagination(res.pagination);
      } catch (err: any) {
        setError(err.message || "Failed to load tickets");
      } finally {
        setLoading(false);
      }
    },
    [requester, search, categoryId, priority, status]
  );

  // Trigger load when requester, filters or page change
  useEffect(() => {
    loadTickets(currentPage);
  }, [loadTickets, currentPage]);

  // Handle filter changes (resets to page 1)
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setCurrentPage(1);
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setCategoryId(e.target.value);
    setCurrentPage(1);
  }

  function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPriority(e.target.value);
    setCurrentPage(1);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatus(e.target.value);
    setCurrentPage(1);
  }

  function handleClearFilters() {
    setSearch("");
    setCategoryId("");
    setPriority("");
    setStatus("");
    setCurrentPage(1);
  }

  const hasActiveFilters = Boolean(search || categoryId || priority || status);

  // Priority Badge Styling
  function getPriorityBadgeClass(p: string) {
    switch (p) {
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

  // Status Badge Styling
  function getStatusBadgeClass(s: string) {
    switch (s) {
      case "In Progress":
        return "badge-status-in-progress";
      case "Resolved":
        return "badge-status-resolved";
      case "New":
      default:
        return "badge-status-new";
    }
  }

  // Format timestamp helper
  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header bar with title and create button */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: "var(--zen-dark)" }}>
            My Tickets
          </h2>
          <p className="text-muted small mb-0">
            View, track, and search IT support requests submitted by{" "}
            <strong>{requester?.name}</strong>
          </p>
        </div>
        {onNavigateToCreate && (
          <button
            type="button"
            className="btn btn-zen-primary d-inline-flex align-items-center gap-2"
            onClick={onNavigateToCreate}
            data-testid="create-ticket-btn"
          >
            <span>+</span> Create New Ticket
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="zen-card p-3 p-md-4">
        <div className="row g-2 align-items-center">
          {/* Search Input */}
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                🔍
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by ticket # or summary..."
                value={search}
                onChange={handleSearchChange}
                data-testid="search-tickets-input"
                aria-label="Search tickets"
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0 bg-white"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={categoryId}
              onChange={handleCategoryChange}
              data-testid="filter-category-select"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={priority}
              onChange={handlePriorityChange}
              data-testid="filter-priority-select"
              aria-label="Filter by priority"
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={status}
              onChange={handleStatusChange}
              data-testid="filter-status-select"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="col-6 col-md-1 d-flex">
              <button
                type="button"
                className="btn btn-zen-secondary w-100 px-2 text-nowrap"
                onClick={handleClearFilters}
                data-testid="clear-filters-btn"
                title="Reset filters"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => loadTickets(currentPage)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="zen-card p-5 text-center" data-testid="tickets-loading">
          <div className="spinner-border text-success mb-3" role="status">
            <span className="visually-hidden">Loading tickets...</span>
          </div>
          <p className="text-muted mb-0">Loading your tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty States */
        hasActiveFilters ? (
          /* No Results State (Search/Filter found nothing) */
          <div
            className="zen-card p-5 text-center"
            data-testid="no-results-view"
          >
            <div className="display-6 mb-3">🔍</div>
            <h3 className="h5 fw-bold mb-2">No Matching Tickets Found</h3>
            <p className="text-muted mb-4" style={{ maxWidth: 450, margin: "0 auto" }}>
              We couldn't find any tickets matching your search criteria. Try
              adjusting your filters or search terms.
            </p>
            <button
              type="button"
              className="btn btn-zen-secondary"
              onClick={handleClearFilters}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Empty State (User has 0 tickets overall) */
          <div
            className="zen-card p-5 text-center"
            data-testid="empty-tickets-view"
          >
            <div className="display-6 mb-3">📂</div>
            <h3 className="h5 fw-bold mb-2">No Tickets Yet</h3>
            <p className="text-muted mb-4" style={{ maxWidth: 450, margin: "0 auto" }}>
              You haven't submitted any IT support tickets yet. Need help with
              hardware, software, or account access?
            </p>
            {onNavigateToCreate && (
              <button
                type="button"
                className="btn btn-zen-primary"
                onClick={onNavigateToCreate}
              >
                + Create Your First Ticket
              </button>
            )}
          </div>
        )
      ) : (
        /* Tickets Table & Mobile Cards */
        <div className="zen-card overflow-hidden">
          {/* Desktop & Tablet Table View */}
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light border-bottom">
                <tr>
                  <th scope="col" style={{ width: "160px" }}>Ticket #</th>
                  <th scope="col" style={{ width: "120px" }}>Date</th>
                  <th scope="col">Summary</th>
                  <th scope="col" style={{ width: "140px" }}>Category</th>
                  <th scope="col" style={{ width: "110px" }}>Priority</th>
                  <th scope="col" style={{ width: "110px" }}>Status</th>
                  <th scope="col" style={{ width: "60px" }} title="Attachments">📎</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket?.(t.id)}
                    style={{ cursor: onSelectTicket ? "pointer" : "default" }}
                    data-testid={`ticket-row-${t.id}`}
                  >
                    <td>
                      <span className="fw-semibold font-monospace" style={{ color: "var(--zen-primary)" }}>
                        {t.ticketNumber}
                      </span>
                    </td>
                    <td className="text-muted small">
                      {formatDate(t.ticketDate || t.createdAt)}
                    </td>
                    <td>
                      <div className="fw-medium text-truncate" style={{ maxWidth: 320 }}>
                        {t.summary}
                      </div>
                      <div className="text-muted small">
                        {t.relatedSystem?.name}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {t.category?.name}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getPriorityBadgeClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="text-center">
                      {t.attachmentCount > 0 ? (
                        <span className="badge bg-light text-muted border" title={`${t.attachmentCount} attachment(s)`}>
                          📎 {t.attachmentCount}
                        </span>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (<768px) */}
          <div className="d-md-none p-3 d-flex flex-column gap-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="p-3 border rounded-3 bg-white"
                onClick={() => onSelectTicket?.(t.id)}
                style={{ cursor: onSelectTicket ? "pointer" : "default" }}
                data-testid={`ticket-card-${t.id}`}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="fw-bold font-monospace text-success">
                    {t.ticketNumber}
                  </span>
                  <div className="d-flex gap-1">
                    <span className={`badge ${getPriorityBadgeClass(t.priority)}`}>
                      {t.priority}
                    </span>
                    <span className={`badge ${getStatusBadgeClass(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                </div>

                <div className="fw-semibold mb-1" style={{ color: "var(--zen-dark)" }}>
                  {t.summary}
                </div>

                <div className="d-flex justify-content-between align-items-center text-muted small mt-2 pt-2 border-top">
                  <span>
                    {t.category?.name} • {t.relatedSystem?.name}
                  </span>
                  <span>{formatDate(t.ticketDate || t.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Bar */}
          {pagination.totalPages > 1 && (
            <div className="p-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2 bg-light">
              <div className="text-muted small">
                Showing{" "}
                <strong>
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                </strong>{" "}
                of <strong>{pagination.totalCount}</strong> tickets
              </div>

              <div className="d-flex gap-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={pagination.page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  data-testid="pagination-prev"
                >
                  ← Previous
                </button>
                <span className="btn btn-sm btn-light border disabled">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  data-testid="pagination-next"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
