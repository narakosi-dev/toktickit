import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { RequesterProvider, useSyncRequesterFromAuth } from "./context/RequesterContext.js";
import Login from "./components/Login.js";
import ChangePassword from "./components/ChangePassword.js";
import AppShell from "./components/AppShell.js";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

/**
 * AuthenticatedApp handles routing between:
 * 1. Login screen (no token)
 * 2. Mandatory password change (mustChangePassword === true)
 * 3. Main AppShell (authenticated, password changed)
 */
function AuthenticatedApp() {
  const { user, token, isLoading } = useAuth();

  // Auto-sync RequesterContext with authenticated user for Lab 2 backward compatibility
  useSyncRequesterFromAuth(user);

  // Show loading spinner while validating stored token
  if (isLoading) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: "var(--zen-bg)" }}
      >
        <div className="text-center">
          <div className="mb-3" style={{ fontSize: "2rem" }}>⏱️</div>
          <p className="text-muted">Loading TokTickIT…</p>
        </div>
      </div>
    );
  }

  // Not logged in — show Login
  if (!token || !user) {
    return <Login />;
  }

  // Logged in but must change password first
  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  // Fully authenticated — show the main application
  return <AppShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <AuthenticatedApp />
      </RequesterProvider>
    </AuthProvider>
  );
}
