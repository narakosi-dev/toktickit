import React, { useState, useEffect } from "react";
import { Requester, fetchRequesters } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

export default function RequesterSelect() {
  const { setRequester } = useRequester();
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadRequesters();
  }, []);

  async function loadRequesters() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchRequesters();
      setRequesters(data);
      if (data.length > 0) {
        setSelectedId(data[0].id.toString());
      }
    } catch (err) {
      setError("Unable to load active development requesters. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const chosen = requesters.find((r) => r.id.toString() === selectedId);
    if (chosen) {
      setRequester(chosen);
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center p-3" style={{ backgroundColor: "var(--zen-bg)" }}>
      <div className="zen-card p-4 p-md-5 shadow-sm" style={{ maxWidth: 560, width: "100%" }}>
        <div className="text-center mb-4">
          <div
            className="d-inline-flex justify-content-center align-items-center mb-3 rounded-circle"
            style={{ width: 64, height: 64, backgroundColor: "var(--zen-pale)", color: "var(--zen-primary)" }}
          >
            <span style={{ fontSize: "2rem" }}>👤</span>
          </div>
          <h2 className="h4 fw-bold" style={{ color: "var(--zen-text-primary)" }}>
            Select Development Requester
          </h2>
          <p className="text-muted small">
            Choose a development requester to simulate the current requester context for Lab 2.
            This is for testing only and is not a login screen.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted small">Loading active requesters...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger" role="alert">
            <p className="mb-2">{error}</p>
            <button className="btn btn-sm btn-outline-danger" onClick={loadRequesters}>
              Retry
            </button>
          </div>
        ) : requesters.length === 0 ? (
          <div className="alert alert-warning text-center" role="alert">
            No active development requesters found. Please run the database seed script.
          </div>
        ) : (
          <form onSubmit={handleContinue}>
            <div className="mb-3">
              <label htmlFor="requester-select" className="form-label">
                Development Requester <span className="required-asterisk">*</span>
              </label>
              <select
                id="requester-select"
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
              >
                {requesters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.email})
                  </option>
                ))}
              </select>
            </div>

            <div
              className="p-3 mb-3 rounded border d-flex align-items-center gap-2"
              style={{ backgroundColor: "var(--zen-surface)", borderColor: "var(--zen-border)" }}
            >
              <span className="text-primary fs-5">ℹ️</span>
              <span className="small text-muted">
                Only active development requesters are shown.
              </span>
            </div>

            <div
              className="p-3 mb-4 rounded border d-flex align-items-start gap-2"
              style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}
            >
              <span className="fs-5">🛡️</span>
              <div>
                <div className="fw-semibold small" style={{ color: "#374151" }}>
                  Authentication coming in Lab 3
                </div>
                <div className="small text-muted">
                  In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-zen-secondary"
                onClick={() => setSelectedId(requesters[0]?.id.toString() || "")}
              >
                Reset
              </button>
              <button type="submit" className="btn btn-zen-primary" disabled={!selectedId}>
                Continue &rarr;
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
