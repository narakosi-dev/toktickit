import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { checkSystem, Category } from "../api.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";
import StaffTicketQueue from "./StaffTicketQueue.js";
import StaffTicketDetail from "./StaffTicketDetail.js";
import UserManagement from "./UserManagement.js";

type Tab =
  | "my-tickets"
  | "create-ticket"
  | "system-status"
  | "ticket-detail"
  | "staff-queue"
  | "user-management";

/** Role badge color mapping */
function roleBadge(role: string) {
  switch (role) {
    case "Administrator":
      return { bg: "#dc3545", label: "Admin" };
    case "IT_Staff":
      return { bg: "#0d6efd", label: "IT Staff" };
    default:
      return { bg: "var(--zen-primary)", label: "Requester" };
  }
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "Administrator";
  const isStaff = user?.role === "IT_Staff";
  const isStaffOrAdmin = isStaff || isAdmin;
  const [activeTab, setActiveTab] = useState<Tab>(
    isAdmin ? "user-management" : isStaff ? "staff-queue" : "my-tickets"
  );
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Lab 1 state preservation for system check
  const [systemState, setSystemState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCheckSystem() {
    setSystemState("loading");
    setErrorMsg("");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setSystemState("success");
    } catch {
      setSystemState("error");
      setErrorMsg("Unable to connect to TokTickIT API");
    }
  }

  const badge = user ? roleBadge(user.role) : null;

  // Determine which tabs to show based on role
  const showMyTickets = true; // All roles see their tickets (Requester primary)
  const showCreateTicket = true; // All roles can create (for Requester mainly)
  const showSystemStatus = true; // Lab 1 regression

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--zen-bg)" }}>
      {/* Top Navbar Header */}
      <header className="zen-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="navbar-brand d-flex align-items-center gap-2 m-0">
            <span>⏱️</span>
            <span>TokTickIT</span>
          </div>

          <nav className="d-flex flex-wrap align-items-center gap-1">
            {isAdmin && (
              <button
                type="button"
                className={`zen-nav-btn ${activeTab === "user-management" ? "active" : ""}`}
                onClick={() => {
                  setSelectedTicketId(null);
                  setActiveTab("user-management");
                }}
                data-testid="nav-user-management"
              >
                👥 User Management
              </button>
            )}
            {isStaffOrAdmin && (
              <button
                type="button"
                className={`zen-nav-btn ${activeTab === "staff-queue" ? "active" : ""}`}
                onClick={() => {
                  setSelectedTicketId(null);
                  setActiveTab("staff-queue");
                }}
              >
                🎫 Ticket Queue
              </button>
            )}
            {showMyTickets && (
              <button
                type="button"
                className={`zen-nav-btn ${activeTab === "my-tickets" || (activeTab === "ticket-detail" && !isStaffOrAdmin) ? "active" : ""}`}
                onClick={() => {
                  setSelectedTicketId(null);
                  setActiveTab("my-tickets");
                }}
              >
                📋 My Tickets
              </button>
            )}
            {showCreateTicket && (
              <button
                type="button"
                className={`zen-nav-btn ${activeTab === "create-ticket" ? "active" : ""}`}
                onClick={() => {
                  setSelectedTicketId(null);
                  setActiveTab("create-ticket");
                }}
              >
                ➕ Create Ticket
              </button>
            )}
            {showSystemStatus && (
              <button
                type="button"
                className={`zen-nav-btn ${activeTab === "system-status" ? "active" : ""}`}
                onClick={() => {
                  setSelectedTicketId(null);
                  setActiveTab("system-status");
                }}
              >
                ⚡ System Status
              </button>
            )}
          </nav>
        </div>

        {/* Authenticated User Identity & Logout */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          {user && (
            <div className="d-flex align-items-center gap-2 text-white">
              <span style={{ fontSize: "1.2rem" }}>👤</span>
              <div>
                <div className="fw-semibold small leading-tight d-flex align-items-center gap-2">
                  <span className="user-name">{user.name}</span>
                  {badge && (
                    <span
                      className="badge user-role-badge"
                      style={{
                        backgroundColor: badge.bg,
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
                <div className="text-white-50" style={{ fontSize: "0.75rem" }}>
                  {user.email}
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            className="btn btn-zen-outline-light btn-sm"
            onClick={logout}
            title="Sign Out"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className="container py-4 flex-grow-1"
        style={{
          maxWidth:
            activeTab === "staff-queue" || activeTab === "user-management" ? 1400 : 960,
        }}
      >
        {activeTab === "user-management" && isAdmin && <UserManagement />}

        {activeTab === "staff-queue" && (
          <StaffTicketQueue
            onSelectTicket={(ticketId) => {
              setSelectedTicketId(ticketId);
              setActiveTab("ticket-detail");
            }}
          />
        )}

        {activeTab === "my-tickets" && (
          <MyTickets
            onNavigateToCreate={() => setActiveTab("create-ticket")}
            onSelectTicket={(ticketId) => {
              setSelectedTicketId(ticketId);
              setActiveTab("ticket-detail");
            }}
          />
        )}

        {activeTab === "ticket-detail" && selectedTicketId && (
          isStaffOrAdmin ? (
            <StaffTicketDetail
              ticketId={selectedTicketId}
              onBack={() => {
                setSelectedTicketId(null);
                setActiveTab("staff-queue");
              }}
            />
          ) : (
            <TicketDetail
              ticketId={selectedTicketId}
              onBack={() => {
                setSelectedTicketId(null);
                setActiveTab("my-tickets");
              }}
            />
          )
        )}

        {activeTab === "create-ticket" && (
          <CreateTicket onTicketCreated={() => setActiveTab("my-tickets")} />
        )}

        {activeTab === "system-status" && (
          <div className="zen-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h4 fw-bold m-0">System Status & Service Catalog</h2>
              <button
                className="btn btn-zen-primary"
                onClick={handleCheckSystem}
                disabled={systemState === "loading"}
              >
                {systemState === "loading" ? "⏳ Loading…" : "Check System"}
              </button>
            </div>

            {systemState === "loading" && (
              <p className="mt-3 text-muted">⏳ Checking backend and database connectivity…</p>
            )}

            {systemState === "success" && (
              <div className="mt-3">
                <p>
                  <strong>System Status:</strong>{" "}
                  <span className="text-success fw-bold">Online</span>
                </p>
                {categories.length > 0 && (
                  <>
                    <p className="mb-2 fw-semibold">Supported Request Categories:</p>
                    <ol className="list-group list-group-numbered" style={{ maxWidth: 400 }}>
                      {categories.map((cat) => (
                        <li key={cat.id} className="list-group-item">
                          {cat.name}
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            )}

            {systemState === "error" && (
              <div className="alert alert-danger mt-3">
                <p className="mb-1">
                  <strong>System Status:</strong> <span className="fw-bold">Offline</span>
                </p>
                <p className="mb-0">{errorMsg}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
