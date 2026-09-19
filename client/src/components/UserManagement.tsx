import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  AdminUserItem,
  CreateAdminUserInput,
  CreateAdminUserResponse,
  UpdateAdminUserInput,
  ResetPasswordResponse,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetUserPassword,
  validatePasswordStrength,
} from "../api.js";

/** Role badge styling */
export function getRoleBadgeStyle(role: string) {
  switch (role) {
    case "Administrator":
      return { bg: "#dc3545", color: "#ffffff", label: "Administrator" };
    case "IT_Staff":
      return { bg: "#0d6efd", color: "#ffffff", label: "IT Staff" };
    case "Requester":
      return { bg: "var(--zen-primary, #006B3C)", color: "#ffffff", label: "Requester" };
    default:
      return { bg: "#6c757d", color: "#ffffff", label: role };
  }
}

export default function UserManagement() {
  const { user: currentUser, token } = useAuth();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [resettingUser, setResettingUser] = useState<AdminUserItem | null>(null);

  // Success Feedback from Actions
  const [createdResult, setCreatedResult] = useState<CreateAdminUserResponse | null>(null);
  const [resetResult, setResetResult] = useState<ResetPasswordResponse | null>(null);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Load users from backend
  const loadUsers = async (search = searchQuery, role = roleFilter) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsers(token, {
        search: search.trim() || undefined,
        role: role !== "All" ? role : undefined,
      });
      setUsers(data);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(searchQuery, roleFilter);
  }, [roleFilter]);

  // Handle Search on Enter or Button Click
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(searchQuery, roleFilter);
  };

  // Count active administrators in system for Safety Invariant 2
  const activeAdminCount = useMemo(() => {
    return users.filter(
      (u) => u.role === "Administrator" && (u.isActive !== undefined ? u.isActive : u.active)
    ).length;
  }, [users]);

  // Copy helper
  const handleCopyToClipboard = (text: string, label = "Password") => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    } catch (e) {
      console.error("Clipboard write failed:", e);
    }
    setCopyNotification(`${label} copied to clipboard!`);
    setTimeout(() => setCopyNotification(null), 3000);
  };

  return (
    <div className="container-fluid px-0">
      {/* Header & Action Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--zen-text-primary, #1B3A2A)" }}>
            User Management
          </h1>
          <p className="text-muted mb-0 small">
            Manage user accounts, roles, access permissions, and temporary password provisioning.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-zen-primary d-inline-flex align-items-center gap-2"
          onClick={() => {
            setCreatedResult(null);
            setShowCreateModal(true);
          }}
          data-testid="add-user-btn"
        >
          <span>➕</span>
          <span>Add User</span>
        </button>
      </div>

      {/* Copy Notification Toast */}
      {copyNotification && (
        <div className="alert alert-success alert-dismissible fade show mb-3 py-2 small" role="alert">
          📋 {copyNotification}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="zen-card p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-12 col-md-6 col-lg-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">🔍</span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search users"
                data-testid="search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSearchQuery("");
                    loadUsers("", roleFilter);
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3 col-lg-3">
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
              data-testid="role-filter"
            >
              <option value="All">All Roles</option>
              <option value="Requester">Requester</option>
              <option value="IT_Staff">IT Staff</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>

          <div className="col-12 col-sm-6 col-md-3 col-lg-4 d-flex gap-2">
            <button type="submit" className="btn btn-zen-secondary flex-grow-1" data-testid="search-btn">
              Search
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("All");
                loadUsers("", "All");
              }}
              title="Reset filters"
            >
              🔄 Refresh
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
          <span className="me-2">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Loading Spinner */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading users...</span>
          </div>
          <p className="mt-2 text-muted small">Loading user directory...</p>
        </div>
      ) : users.length === 0 ? (
        /* Empty State */
        <div className="zen-card p-5 text-center">
          <div style={{ fontSize: "3rem" }}>👥</div>
          <h4 className="h5 fw-bold mt-2">No users found</h4>
          <p className="text-muted small">
            {searchQuery || roleFilter !== "All"
              ? "No accounts match your current search and role filters."
              : "No user accounts registered yet."}
          </p>
          {(searchQuery || roleFilter !== "All") && (
            <button
              type="button"
              className="btn btn-zen-primary btn-sm mt-2"
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("All");
                loadUsers("", "All");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View */}
          <div className="zen-card d-none d-md-block overflow-hidden mb-4">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" data-testid="users-table">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="ps-3">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Password Status</th>
                    <th scope="col">Created Date</th>
                    <th scope="col" className="text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const isActive = u.isActive !== undefined ? u.isActive : u.active;
                    const roleBadge = getRoleBadgeStyle(u.role);

                    return (
                      <tr key={u.id} data-testid={`user-row-${u.id}`}>
                        <td className="ps-3 fw-semibold">
                          <div className="d-flex align-items-center gap-2">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span
                                className="badge bg-light text-dark border"
                                style={{ fontSize: "0.65rem" }}
                              >
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-muted small">{u.email}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: roleBadge.bg,
                              color: roleBadge.color,
                              fontSize: "0.75rem",
                              padding: "4px 8px",
                            }}
                          >
                            {roleBadge.label}
                          </span>
                        </td>
                        <td>
                          {isActive ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                              ● Active
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">
                              ○ Inactive
                            </span>
                          )}
                        </td>
                        <td>
                          {u.mustChangePassword ? (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1" title="User must change password at next login">
                              ⚠️ Must Change
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border px-2 py-1">
                              ✓ Normal
                            </span>
                          )}
                        </td>
                        <td className="text-muted small">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="text-end pe-3">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => setEditingUser(u)}
                              data-testid={`edit-user-btn-${u.id}`}
                              title="Edit user details"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-warning btn-sm"
                              onClick={() => {
                                setResetResult(null);
                                setResettingUser(u);
                              }}
                              data-testid={`reset-pwd-btn-${u.id}`}
                              title="Reset user password"
                            >
                              Reset Password
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Cards View (< 768px) */}
          <div className="d-md-none d-flex flex-column gap-3 mb-4" data-testid="users-cards-mobile">
            {users.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const isActive = u.isActive !== undefined ? u.isActive : u.active;
              const roleBadge = getRoleBadgeStyle(u.role);

              return (
                <div key={u.id} className="zen-card p-3" data-testid={`user-card-${u.id}`}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-bold d-flex align-items-center gap-1">
                        {u.name}
                        {isSelf && (
                          <span className="badge bg-light text-dark border small">You</span>
                        )}
                      </div>
                      <div className="text-muted small">{u.email}</div>
                    </div>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: roleBadge.bg,
                        color: roleBadge.color,
                      }}
                    >
                      {roleBadge.label}
                    </span>
                  </div>

                  <div className="d-flex flex-wrap gap-2 my-2 align-items-center small">
                    {isActive ? (
                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                        ● Active
                      </span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
                        ○ Inactive
                      </span>
                    )}

                    {u.mustChangePassword ? (
                      <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                        ⚠️ Must Change
                      </span>
                    ) : (
                      <span className="badge bg-light text-muted border">
                        ✓ Normal
                      </span>
                    )}
                  </div>

                  <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm flex-grow-1"
                      onClick={() => setEditingUser(u)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-warning btn-sm flex-grow-1"
                      onClick={() => {
                        setResetResult(null);
                        setResettingUser(u);
                      }}
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MODAL 1: Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          token={token!}
          onClose={() => {
            setShowCreateModal(false);
            setCreatedResult(null);
          }}
          onSuccess={(res) => {
            setCreatedResult(res);
            loadUsers(searchQuery, roleFilter);
          }}
          createdResult={createdResult}
          onCopy={handleCopyToClipboard}
        />
      )}

      {/* MODAL 2: Edit User Modal */}
      {editingUser && (
        <EditUserModal
          token={token!}
          user={editingUser}
          currentUser={currentUser}
          activeAdminCount={activeAdminCount}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            loadUsers(searchQuery, roleFilter);
          }}
        />
      )}

      {/* MODAL 3: Reset Password Modal */}
      {resettingUser && (
        <ResetPasswordModal
          token={token!}
          user={resettingUser}
          onClose={() => {
            setResettingUser(null);
            setResetResult(null);
          }}
          onSuccess={(res) => {
            setResetResult(res);
            loadUsers(searchQuery, roleFilter);
          }}
          resetResult={resetResult}
          onCopy={handleCopyToClipboard}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Component: Create User Modal
// ---------------------------------------------------------------------------
interface CreateUserModalProps {
  token: string;
  onClose: () => void;
  onSuccess: (res: CreateAdminUserResponse) => void;
  createdResult: CreateAdminUserResponse | null;
  onCopy: (text: string, label: string) => void;
}

function CreateUserModal({
  token,
  onClose,
  onSuccess,
  createdResult,
  onCopy,
}: CreateUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Requester" | "IT_Staff" | "Administrator">("Requester");
  const [active, setActive] = useState(true);
  const [initialPassword, setInitialPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic validation
    if (!name.trim() || name.trim().length < 2) {
      setFormError("Full name must be at least 2 characters");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setFormError("Please enter a valid email address");
      return;
    }

    // Password strength check if explicitly provided
    if (initialPassword) {
      const strength = validatePasswordStrength(initialPassword);
      if (!strength.valid) {
        setFormError(strength.reason || "Password does not meet complexity requirements");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: CreateAdminUserInput = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        active,
      };
      if (initialPassword.trim()) {
        payload.initialPassword = initialPassword.trim();
      }

      const res = await createAdminUser(token, payload);
      onSuccess(res);
    } catch (err: any) {
      console.error("Create user failed:", err);
      setFormError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content zen-card shadow">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold" style={{ color: "var(--zen-text-primary, #1B3A2A)" }}>
              {createdResult ? "User Created Successfully" : "Add New User"}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>

          <div className="modal-body p-4">
            {createdResult ? (
              /* Success Screen showing Generated Temporary Password */
              <div className="text-center py-2">
                <div className="mb-3" style={{ fontSize: "2.5rem" }}>✅</div>
                <h6 className="fw-bold">User Account Created!</h6>
                <p className="text-muted small mb-3">
                  Account for <strong>{createdResult.name}</strong> ({createdResult.email}) is ready.
                </p>

                <div className="p-3 bg-light border rounded mb-3 text-start">
                  <label className="form-label small fw-semibold text-muted mb-1">
                    Temporary Initial Password:
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control font-monospace bg-white fw-bold"
                      value={createdResult.temporaryPassword || createdResult.initialPassword || ""}
                      readOnly
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        onCopy(
                          createdResult.temporaryPassword || createdResult.initialPassword || "",
                          "Temporary password"
                        )
                      }
                      title="Copy to clipboard"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="form-text small text-warning-emphasis mt-2">
                    ⚠️ The user will be required to change this password on their first login.
                  </div>
                </div>

                <button type="button" className="btn btn-zen-primary w-100" onClick={onClose}>
                  Done
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} data-testid="create-user-form">
                {formError && (
                  <div className="alert alert-danger py-2 small mb-3" role="alert">
                    {formError}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    aria-label="Full Name"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Email Address *</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. john.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-label="Email Address"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Role *</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    aria-label="Role"
                  >
                    <option value="Requester">Requester (Create & view own tickets)</option>
                    <option value="IT_Staff">IT Staff (Shared ticket queue, notes, ops)</option>
                    <option value="Administrator">Administrator (User management & full access)</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    Initial Password <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="Leave blank to auto-generate strong password"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    aria-label="Initial Password"
                  />
                  <div className="form-text small text-muted">
                    If left blank, a random compliant temporary password will be generated.
                  </div>
                </div>

                <div className="form-check form-switch mb-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="createUserActiveSwitch"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="createUserActiveSwitch">
                    Account Active immediately
                  </label>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-zen-primary btn-sm"
                    disabled={submitting}
                    data-testid="submit-create-user-btn"
                  >
                    {submitting ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Component: Edit User Modal (with Safety Invariant Enforcement)
// ---------------------------------------------------------------------------
interface EditUserModalProps {
  token: string;
  user: AdminUserItem;
  currentUser: any;
  activeAdminCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

function EditUserModal({
  token,
  user,
  currentUser,
  activeAdminCount,
  onClose,
  onSuccess,
}: EditUserModalProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"Requester" | "IT_Staff" | "Administrator">(user.role);
  const [active, setActive] = useState(user.isActive !== undefined ? user.isActive : user.active);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Safety Invariants
  const isSelf = currentUser?.id === user.id;
  const isTargetActiveAdmin = user.role === "Administrator" && (user.isActive !== undefined ? user.isActive : user.active);
  const isSoleActiveAdmin = isTargetActiveAdmin && activeAdminCount <= 1;

  // Invariant 1: Admin cannot deactivate own account
  const disableDeactivateSelf = isSelf;

  // Invariant 2: Cannot deactivate or demote last active admin
  const disableDeactivateLastAdmin = isSoleActiveAdmin;
  const disableRoleChangeLastAdmin = isSoleActiveAdmin;

  const disableActiveToggle = disableDeactivateLastAdmin || disableDeactivateSelf;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || name.trim().length < 2) {
      setFormError("Full name must be at least 2 characters");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setFormError("Please enter a valid email address");
      return;
    }

    // Safety checks before sending
    if (active === false && isSelf) {
      setFormError("You cannot deactivate your own account.");
      return;
    }

    if (active === false && isSoleActiveAdmin) {
      setFormError("Cannot deactivate the only active Administrator.");
      return;
    }

    if (role !== "Administrator" && isSoleActiveAdmin) {
      setFormError("Cannot deactivate or change role of the last active Administrator.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: UpdateAdminUserInput = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        active,
        isActive: active,
      };

      await updateAdminUser(token, user.id, payload);
      onSuccess();
    } catch (err: any) {
      console.error("Edit user failed:", err);
      setFormError(err.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content zen-card shadow">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold" style={{ color: "var(--zen-text-primary, #1B3A2A)" }}>
              Edit User: {user.name}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>

          <form onSubmit={handleSubmit} data-testid="edit-user-form">
            <div className="modal-body p-4">
              {formError && (
                <div className="alert alert-danger py-2 small mb-3" role="alert">
                  {formError}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small fw-semibold">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  aria-label="Full Name"
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Email Address"
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Role *</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  disabled={disableRoleChangeLastAdmin}
                  aria-label="Role"
                >
                  <option value="Requester">Requester</option>
                  <option value="IT_Staff">IT Staff</option>
                  <option value="Administrator">Administrator</option>
                </select>
                {disableRoleChangeLastAdmin && (
                  <div className="form-text text-danger small">
                    🛡️ Cannot change role of the last active Administrator.
                  </div>
                )}
              </div>

              <div className="p-3 bg-light border rounded mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="editUserActiveSwitch"
                    checked={active}
                    disabled={disableActiveToggle}
                    onChange={(e) => setActive(e.target.checked)}
                    data-testid="edit-user-active"
                    aria-label="Active Status"
                  />
                  <label className="form-check-label fw-semibold small" htmlFor="editUserActiveSwitch">
                    {active ? "Account is Active" : "Account is Deactivated"}
                  </label>
                </div>

                {disableDeactivateLastAdmin ? (
                  <div className="text-danger small mt-2">
                    🛡️ Cannot deactivate the last active Administrator.
                  </div>
                ) : disableDeactivateSelf ? (
                  <div className="text-muted small mt-2">
                    🛡️ You cannot deactivate your own account.
                  </div>
                ) : (
                  <div className="text-muted small mt-2">
                    Deactivating prevents user login while preserving historical tickets and notes.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer border-top p-3">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-zen-primary btn-sm"
                disabled={submitting}
                data-testid="submit-edit-user-btn"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Component: Reset Password Modal
// ---------------------------------------------------------------------------
interface ResetPasswordModalProps {
  token: string;
  user: AdminUserItem;
  onClose: () => void;
  onSuccess: (res: ResetPasswordResponse) => void;
  resetResult: ResetPasswordResponse | null;
  onCopy: (text: string, label: string) => void;
}

function ResetPasswordModal({
  token,
  user,
  onClose,
  onSuccess,
  resetResult,
  onCopy,
}: ResetPasswordModalProps) {
  const [customPassword, setCustomPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (customPassword) {
      const strength = validatePasswordStrength(customPassword);
      if (!strength.valid) {
        setFormError(strength.reason || "Password does not meet complexity requirements");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await resetUserPassword(
        token,
        user.id,
        customPassword.trim() ? customPassword.trim() : undefined
      );
      onSuccess(res);
    } catch (err: any) {
      console.error("Reset password failed:", err);
      setFormError(err.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content zen-card shadow">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold" style={{ color: "var(--zen-text-primary, #1B3A2A)" }}>
              {resetResult ? "Password Reset Successful" : `Reset Password: ${user.name}`}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>

          <div className="modal-body p-4">
            {resetResult ? (
              /* Success Result View */
              <div className="text-center py-2">
                <div className="mb-3" style={{ fontSize: "2.5rem" }}>🔑</div>
                <h6 className="fw-bold">New Temporary Password Issued</h6>
                <p className="text-muted small mb-3">
                  Password has been reset for <strong>{user.name}</strong> ({user.email}).
                </p>

                <div className="p-3 bg-light border rounded mb-3 text-start">
                  <label className="form-label small fw-semibold text-muted mb-1">
                    New Temporary Password:
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control font-monospace bg-white fw-bold"
                      value={resetResult.temporaryPassword}
                      readOnly
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => onCopy(resetResult.temporaryPassword, "Temporary password")}
                      title="Copy to clipboard"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="form-text small text-warning-emphasis mt-2">
                    ⚠️ The user will be required to change this password on their next login.
                  </div>
                </div>

                <button type="button" className="btn btn-zen-primary w-100" onClick={onClose}>
                  Done
                </button>
              </div>
            ) : (
              /* Confirmation & Custom Password Input */
              <form onSubmit={handleReset} data-testid="reset-password-form">
                {formError && (
                  <div className="alert alert-danger py-2 small mb-3" role="alert">
                    {formError}
                  </div>
                )}

                <div className="alert alert-warning py-2 small mb-3">
                  ⚠️ This action will invalidate the user's current credentials. They must change password upon their next login.
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    New Temporary Password <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="Leave blank to auto-generate strong password"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    aria-label="New Temporary Password"
                  />
                  <div className="form-text small text-muted">
                    If blank, a random compliant temporary password will be generated automatically.
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning btn-sm"
                    disabled={submitting}
                    data-testid="confirm-reset-pwd-btn"
                  >
                    {submitting ? "Resetting..." : "Confirm Reset Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
