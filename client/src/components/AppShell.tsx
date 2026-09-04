import React, { useState } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { checkSystem, Category } from "../api.js";

type Tab = "my-tickets" | "create-ticket" | "system-status";

export default function AppShell() {
  const { requester, clearRequester } = useRequester();
  const [activeTab, setActiveTab] = useState<Tab>("system-status");

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

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--zen-bg)" }}>
      {/* Top Navbar Header */}
      <header className="zen-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="navbar-brand d-flex align-items-center gap-2 m-0">
            <span>⏱️</span>
            <span>TokTickIT</span>
          </div>

          <nav className="d-flex align-items-center gap-1">
            <button
              type="button"
              className={`zen-nav-btn ${activeTab === "my-tickets" ? "active" : ""}`}
              onClick={() => setActiveTab("my-tickets")}
            >
              📋 My Tickets
            </button>
            <button
              type="button"
              className={`zen-nav-btn ${activeTab === "create-ticket" ? "active" : ""}`}
              onClick={() => setActiveTab("create-ticket")}
            >
              ➕ Create Ticket
            </button>
            <button
              type="button"
              className={`zen-nav-btn ${activeTab === "system-status" ? "active" : ""}`}
              onClick={() => setActiveTab("system-status")}
            >
              ⚡ System Status
            </button>
          </nav>
        </div>

        {/* User Identity & Switcher */}
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2 text-white">
            <span style={{ fontSize: "1.2rem" }}>👤</span>
            <div>
              <div className="fw-semibold small leading-tight">{requester?.name}</div>
              <div className="text-white-50" style={{ fontSize: "0.75rem" }}>
                {requester?.email}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-zen-outline-light btn-sm"
            onClick={clearRequester}
            title="Switch Development Requester"
          >
            Change Requester
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container py-4 flex-grow-1" style={{ maxWidth: 960 }}>
        {activeTab === "my-tickets" && (
          <div className="zen-card p-4 text-center">
            <h2 className="h4 fw-bold mb-3">My Tickets</h2>
            <p className="text-muted mb-4">
              Ticket listing, searching, filtering, and pagination for <strong>{requester?.name}</strong> will be implemented in Issue 4.
            </p>
            <button className="btn btn-zen-primary" onClick={() => setActiveTab("create-ticket")}>
              + Create New Ticket
            </button>
          </div>
        )}

        {activeTab === "create-ticket" && (
          <div className="zen-card p-4 text-center">
            <h2 className="h4 fw-bold mb-3">Create IT Support Ticket</h2>
            <p className="text-muted mb-4">
              Ticket submission form with system selection, priority rating, and attachments will be implemented in Issue 3.
            </p>
            <button className="btn btn-zen-secondary" onClick={() => setActiveTab("my-tickets")}>
              View My Tickets
            </button>
          </div>
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
