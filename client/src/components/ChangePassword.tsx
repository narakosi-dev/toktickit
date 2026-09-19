import React, { useState, FormEvent, useMemo } from "react";
import { useAuth } from "../context/AuthContext.js";

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "At least one uppercase letter (A–Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "At least one lowercase letter (a–z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "At least one digit (0–9)", test: (pw) => /[0-9]/.test(pw) },
  { label: "At least one special character (!@#$%^&*…)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export default function ChangePassword() {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(newPassword) })),
    [newPassword]
  );

  const allRulesPassed = ruleResults.every((r) => r.passed);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = currentPassword.length > 0 && allRulesPassed && passwordsMatch && !busy;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!canSubmit) return;

    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      // On success, AuthContext updates user profile (mustChangePassword: false)
      // The parent component will redirect away from this screen automatically
    } catch (err: any) {
      setError(err.message || "Failed to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: "var(--zen-bg)" }}
    >
      <div style={{ width: "100%", maxWidth: 480, padding: "1rem" }}>
        <div className="zen-card p-4 p-sm-5">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="mb-2" style={{ fontSize: "2.5rem" }}>🔐</div>
            <h1 className="h4 fw-bold mb-1" style={{ color: "var(--zen-text-primary)" }}>
              Change Your Password
            </h1>
            {user?.mustChangePassword && (
              <div
                className="alert py-2 px-3 small mt-3 mb-0"
                role="alert"
                style={{
                  backgroundColor: "#fff3cd",
                  borderColor: "#ffecb5",
                  color: "#664d03",
                }}
              >
                🔑 You must change your initial password before continuing.
              </div>
            )}
            {user && (
              <p className="text-muted small mt-2 mb-0">
                Signed in as <strong>{user.name}</strong> ({user.email})
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-danger py-2 small d-flex align-items-start gap-2" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Current Password */}
            <div className="mb-3">
              <label htmlFor="current-password" className="form-label small fw-semibold">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                className="form-control"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={busy}
                autoComplete="current-password"
                autoFocus
              />
            </div>

            {/* New Password */}
            <div className="mb-3">
              <label htmlFor="new-password" className="form-label small fw-semibold">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                className="form-control"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={busy}
                autoComplete="new-password"
              />

              {/* Password Strength Checklist */}
              {newPassword.length > 0 && (
                <ul className="list-unstyled mt-2 mb-0 small">
                  {ruleResults.map((rule, idx) => (
                    <li
                      key={idx}
                      className={`d-flex align-items-center gap-1 ${
                        rule.passed ? "text-success" : "text-muted"
                      }`}
                    >
                      <span>{rule.passed ? "✅" : "⬜"}</span>
                      <span>{rule.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-3">
              <label htmlFor="confirm-password" className="form-label small fw-semibold">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                className={`form-control ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? "is-valid"
                      : "is-invalid"
                    : ""
                }`}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={busy}
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <div className="invalid-feedback">Passwords do not match.</div>
              )}
              {confirmPassword.length > 0 && passwordsMatch && (
                <div className="valid-feedback">Passwords match!</div>
              )}
            </div>

            <button
              id="change-password-submit"
              type="submit"
              className="btn btn-zen-primary w-100 mt-2"
              disabled={!canSubmit}
            >
              {busy ? "⏳ Changing…" : "Change Password"}
            </button>
          </form>

          {/* Logout Escape */}
          <div className="text-center mt-3">
            <button
              type="button"
              className="btn btn-link btn-sm text-muted"
              onClick={logout}
            >
              Sign out instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
