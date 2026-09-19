import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import UserManagement from "../../src/components/UserManagement.js";
import { AuthContext } from "../../src/context/AuthContext.js";

// Mock the API module
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return {
    ...actual,
    fetchAdminUsers: vi.fn(),
    createAdminUser: vi.fn(),
    updateAdminUser: vi.fn(),
    resetUserPassword: vi.fn(),
  };
});

import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetUserPassword,
} from "../../src/api.js";

const mockFetchAdminUsers = fetchAdminUsers as ReturnType<typeof vi.fn>;
const mockCreateAdminUser = createAdminUser as ReturnType<typeof vi.fn>;
const mockUpdateAdminUser = updateAdminUser as ReturnType<typeof vi.fn>;
const mockResetUserPassword = resetUserPassword as ReturnType<typeof vi.fn>;
const mockWriteText = vi.fn().mockResolvedValue(undefined);

const sampleUsers = [
  {
    id: 1,
    name: "Admin Super",
    email: "admin.super@toktickit.com",
    role: "Administrator" as const,
    isActive: true,
    active: true,
    mustChangePassword: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Admin Second",
    email: "admin.second@toktickit.com",
    role: "Administrator" as const,
    isActive: true,
    active: true,
    mustChangePassword: false,
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
  },
  {
    id: 3,
    name: "Michael Brown",
    email: "michael.brown@toktickit.com",
    role: "IT_Staff" as const,
    isActive: true,
    active: true,
    mustChangePassword: false,
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: 4,
    name: "Alice Requester",
    email: "alice@example.com",
    role: "Requester" as const,
    isActive: false,
    active: false,
    mustChangePassword: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
];

const mockAuthValue = {
  user: {
    id: 1,
    name: "Admin Super",
    email: "admin.super@toktickit.com",
    role: "Administrator" as const,
    mustChangePassword: false,
  },
  token: "mock-admin-jwt-token",
  login: vi.fn(),
  logout: vi.fn(),
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  refreshProfile: vi.fn(),
  isAuthenticated: true,
  isLoading: false,
};

function renderComponent(authOverrides = {}) {
  return render(
    <AuthContext.Provider value={{ ...mockAuthValue, ...authOverrides }}>
      <UserManagement />
    </AuthContext.Provider>
  );
}

describe("Administrator User Management UI (UserManagement.test.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAdminUsers.mockResolvedValue([...sampleUsers]);
  });

  it("TC-CLI-ADMIN-01: renders user table with Name, Email, Role badge, Status, Password Status, Actions", async () => {
    renderComponent();

    await waitFor(() => {
      const table = screen.getByTestId("users-table");
      expect(within(table).getByText("Admin Super")).toBeInTheDocument();
      expect(within(table).getByText("Michael Brown")).toBeInTheDocument();
      expect(within(table).getByText("Alice Requester")).toBeInTheDocument();
    });

    const table = screen.getByTestId("users-table");

    // Check email
    expect(within(table).getByText("admin.super@toktickit.com")).toBeInTheDocument();
    expect(within(table).getByText("alice@example.com")).toBeInTheDocument();

    // Check Role Badges
    expect(within(table).getAllByText("Administrator").length).toBeGreaterThanOrEqual(1);
    expect(within(table).getAllByText("IT Staff").length).toBeGreaterThanOrEqual(1);
    expect(within(table).getAllByText("Requester").length).toBeGreaterThanOrEqual(1);

    // Check Status badges
    expect(within(table).getAllByText(/● Active/i).length).toBe(3);
    expect(within(table).getAllByText(/○ Inactive/i).length).toBe(1);

    // Check Password Status badges
    expect(within(table).getAllByText(/✓ Normal/i).length).toBe(3);
    expect(within(table).getAllByText(/⚠️ Must Change/i).length).toBe(1);

    // Check Action Buttons
    expect(within(table).getAllByText("Edit").length).toBe(4);
    expect(within(table).getAllByText("Reset Password").length).toBe(4);
  });

  it("filters users by role and performs keyword search", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      const table = screen.getByTestId("users-table");
      expect(within(table).getByText("Admin Super")).toBeInTheDocument();
    });

    // Change role filter to IT_Staff
    const roleSelect = screen.getByTestId("role-filter");
    await user.selectOptions(roleSelect, "IT_Staff");

    expect(mockFetchAdminUsers).toHaveBeenCalledWith(
      "mock-admin-jwt-token",
      expect.objectContaining({ role: "IT_Staff" })
    );

    // Type in search query
    const searchInput = screen.getByTestId("search-input");
    await user.clear(searchInput);
    await user.type(searchInput, "Brown");
    await user.click(screen.getByTestId("search-btn"));

    expect(mockFetchAdminUsers).toHaveBeenCalledWith(
      "mock-admin-jwt-token",
      expect.objectContaining({ search: "Brown" })
    );
  });

  it("TC-CLI-ADMIN-02: 'Add User' button opens modal with form fields and creates new user", async () => {
    const user = userEvent.setup();
    mockCreateAdminUser.mockResolvedValue({
      id: 5,
      name: "New Engineer",
      email: "engineer@toktickit.com",
      role: "IT_Staff",
      isActive: true,
      active: true,
      mustChangePassword: true,
      temporaryPassword: "GeneratedTempPwd999!",
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
    });

    // Click Add User button
    await user.click(screen.getByTestId("add-user-btn"));

    // Verify modal is open
    expect(screen.getByRole("heading", { name: /add new user/i })).toBeInTheDocument();
    const form = screen.getByTestId("create-user-form");
    expect(within(form).getByLabelText(/full name/i)).toBeInTheDocument();
    expect(within(form).getByLabelText(/email address/i)).toBeInTheDocument();
    expect(within(form).getByLabelText(/role/i)).toBeInTheDocument();
    expect(within(form).getByLabelText(/initial password/i)).toBeInTheDocument();

    // Fill out form
    await user.type(within(form).getByLabelText(/full name/i), "New Engineer");
    await user.type(within(form).getByLabelText(/email address/i), "engineer@toktickit.com");
    await user.selectOptions(within(form).getByLabelText(/role/i), "IT_Staff");

    // Submit form
    await user.click(screen.getByTestId("submit-create-user-btn"));

    await waitFor(() => {
      expect(mockCreateAdminUser).toHaveBeenCalledWith("mock-admin-jwt-token", {
        name: "New Engineer",
        email: "engineer@toktickit.com",
        role: "IT_Staff",
        active: true,
      });
    });

    // Verify temporary password display
    await waitFor(() => {
      expect(screen.getByText("User Account Created!")).toBeInTheDocument();
      expect(screen.getByDisplayValue("GeneratedTempPwd999!")).toBeInTheDocument();
    });

    // Test copy button
    const copyBtn = screen.getByRole("button", { name: /copy/i });
    await user.click(copyBtn);
    expect(screen.getByText(/temporary password copied to clipboard/i)).toBeInTheDocument();
  });

  it("TC-CLI-ADMIN-03: 'Edit User' modal allows modifying name, role, and active status", async () => {
    const user = userEvent.setup();
    mockUpdateAdminUser.mockResolvedValue({
      id: 3,
      name: "Michael Brown Senior",
      email: "michael.brown@toktickit.com",
      role: "Administrator",
      isActive: true,
      active: true,
      mustChangePassword: false,
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-btn-3")).toBeInTheDocument();
    });

    // Open Edit modal for Michael Brown (id: 3)
    await user.click(screen.getByTestId("edit-user-btn-3"));

    expect(screen.getByRole("heading", { name: /edit user: michael brown/i })).toBeInTheDocument();
    const form = screen.getByTestId("edit-user-form");

    // Modify name and role
    const nameInput = within(form).getByLabelText(/full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Michael Brown Senior");

    const roleSelect = within(form).getByLabelText(/role/i);
    await user.selectOptions(roleSelect, "Administrator");

    // Submit
    await user.click(screen.getByTestId("submit-edit-user-btn"));

    await waitFor(() => {
      expect(mockUpdateAdminUser).toHaveBeenCalledWith("mock-admin-jwt-token", 3, {
        name: "Michael Brown Senior",
        email: "michael.brown@toktickit.com",
        role: "Administrator",
        active: true,
        isActive: true,
      });
    });
  });

  it("TC-CLI-ADMIN-04 (Safety Invariant 1): Deactivate toggle is disabled for currently logged-in administrator", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-btn-1")).toBeInTheDocument();
    });

    // Open Edit modal for self (id: 1, Admin Super)
    await user.click(screen.getByTestId("edit-user-btn-1"));

    expect(screen.getByRole("heading", { name: /edit user: admin super/i })).toBeInTheDocument();

    // Verify Active status toggle is disabled
    const activeToggle = screen.getByTestId("edit-user-active");
    expect(activeToggle).toBeDisabled();
    expect(screen.getByText(/you cannot deactivate your own account/i)).toBeInTheDocument();
  });

  it("TC-CLI-ADMIN-04 (Safety Invariant 2): Deactivate toggle & role are disabled when editing the sole active Administrator", async () => {
    const user = userEvent.setup();

    // Single active admin scenario (Admin Second is deactivated)
    const singleAdminUsers = [
      { ...sampleUsers[0] }, // id 1, active Admin
      { ...sampleUsers[1], isActive: false, active: false }, // id 2, deactivated Admin
      { ...sampleUsers[2] }, // id 3, IT Staff
    ];
    mockFetchAdminUsers.mockResolvedValue(singleAdminUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-btn-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-user-btn-1"));

    // Verify both role select and active toggle are disabled
    const form = screen.getByTestId("edit-user-form");
    const roleSelect = within(form).getByLabelText(/role/i);
    const activeToggle = screen.getByTestId("edit-user-active");

    expect(roleSelect).toBeDisabled();
    expect(activeToggle).toBeDisabled();
    expect(screen.getByText(/cannot deactivate.*last active administrator/i)).toBeInTheDocument();
  });

  it("TC-CLI-ADMIN-05: 'Reset Password' button triggers confirmation dialog and displays new temporary password", async () => {
    const user = userEvent.setup();
    mockResetUserPassword.mockResolvedValue({
      message: "Initial password reset successfully",
      temporaryPassword: "ResetTempPassword123!",
      mustChangePassword: true,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("reset-pwd-btn-3")).toBeInTheDocument();
    });

    // Click Reset Password for Michael Brown (id: 3)
    await user.click(screen.getByTestId("reset-pwd-btn-3"));

    expect(
      screen.getByRole("heading", { name: /reset password: michael brown/i })
    ).toBeInTheDocument();

    // Confirm reset
    await user.click(screen.getByTestId("confirm-reset-pwd-btn"));

    await waitFor(() => {
      expect(mockResetUserPassword).toHaveBeenCalledWith("mock-admin-jwt-token", 3, undefined);
    });

    // Displays new temporary password
    await waitFor(() => {
      expect(screen.getByText("New Temporary Password Issued")).toBeInTheDocument();
      expect(screen.getByDisplayValue("ResetTempPassword123!")).toBeInTheDocument();
    });

    // Click copy button
    const copyBtn = screen.getByRole("button", { name: /copy/i });
    await user.click(copyBtn);
    expect(screen.getByText(/temporary password copied to clipboard/i)).toBeInTheDocument();
  });
});
