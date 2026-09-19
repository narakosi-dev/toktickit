import React, { useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext.js";

/** Quick-access demo credentials for each role */
const DEMO_USERS = [
  { label: "👤 Requester", email: "alice.johnson@example.com", password: "Password123!" },
  { label: "🔧 IT Staff", email: "bob.smith@example.com", password: "Password123!" },
  { label: "🛡️ Administrator", email: "admin@toktickit.com", password: "Password123!" },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setBusy(true);
    try {
      await login(trimmedEmail, password);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleDemoLogin(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  }

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: "var(--zen-bg)" }}
    >
      <div style={{ width: "100%", maxWidth: 440, padding: "1rem" }}>
        {/* Login Card */}
        <div className="zen-card p-4 p-sm-5">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="mb-2" style={{ fontSize: "2.5rem" }}>⏱️</div>
            <h1 className="h3 fw-bold mb-1" style={{ color: "var(--zen-text-primary)" }}>
              Tok<span style={{ color: "var(--zen-primary)" }}>Tick</span>IT
            </h1>
            <p className="text-muted small mb-0">IT Service Desk — Sign In</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger py-2 small d-flex align-items-start gap-2" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label small fw-semibold">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="login-password" className="form-label small fw-semibold">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                autoComplete="current-password"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-zen-primary w-100 mt-2"
              disabled={busy}
            >
              {busy ? "⏳ Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Demo Quick-Login Buttons */}
          <hr className="my-4" />
          <p className="text-muted small text-center mb-2">Quick Login (Demo Accounts):</p>
          <div className="d-flex flex-column gap-2">
            {DEMO_USERS.map((demo) => (
              <button
                key={demo.email}
                type="button"
                className="btn btn-zen-outline-light btn-sm text-start"
                style={{
                  borderColor: "var(--zen-border)",
                  color: "var(--zen-text-primary)",
                }}
                onClick={() => handleDemoLogin(demo.email, demo.password)}
                disabled={busy}
              >
                {demo.label}{" "}
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                  ({demo.email})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-muted mt-3" style={{ fontSize: "0.75rem" }}>
          CPE 334 — Software Engineering in the Age of AI Agents
        </p>
      </div>
    </div>
  );
}
