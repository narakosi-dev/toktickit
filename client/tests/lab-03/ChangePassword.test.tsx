import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import App from "../../src/App.js";

// Mock the API module
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return {
    ...actual,
    loginUser: vi.fn(),
    logoutUser: vi.fn().mockResolvedValue(undefined),
    getMe: vi.fn(),
    changePassword: vi.fn(),
  };
});

import { loginUser, getMe, changePassword, logoutUser } from "../../src/api.js";
const mockLoginUser = loginUser as ReturnType<typeof vi.fn>;
const mockGetMe = getMe as ReturnType<typeof vi.fn>;
const mockChangePassword = changePassword as ReturnType<typeof vi.fn>;
const mockLogoutUser = logoutUser as ReturnType<typeof vi.fn>;

/** Helper: log in with mustChangePassword: true so the ChangePassword screen appears */
async function loginAndReachChangePassword() {
  const user = userEvent.setup();
  mockLoginUser.mockResolvedValue({
    token: "test-jwt-token",
    user: {
      id: 1,
      email: "alice@example.com",
      name: "Alice Johnson",
      role: "Requester",
      mustChangePassword: true,
    },
  });

  render(<App />);

  await user.type(screen.getByLabelText(/email address/i), "alice@example.com");
  await user.type(screen.getByLabelText(/^password$/i), "Password123!");
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  await waitFor(() => {
    expect(screen.getByText(/change your password/i)).toBeInTheDocument();
  });

  return user;
}

/** Helper to get specific password fields by their ID */
function getPasswordFields() {
  return {
    currentPassword: document.getElementById("current-password") as HTMLInputElement,
    newPassword: document.getElementById("new-password") as HTMLInputElement,
    confirmPassword: document.getElementById("confirm-password") as HTMLInputElement,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockGetMe.mockRejectedValue(new Error("No token"));
});

describe("ChangePassword Component", () => {
  it("shows mandatory password change warning when mustChangePassword is true", async () => {
    await loginAndReachChangePassword();
    expect(screen.getByText(/you must change your initial password/i)).toBeInTheDocument();
  });

  it("shows signed-in user information", async () => {
    await loginAndReachChangePassword();
    expect(screen.getByText(/alice johnson/i)).toBeInTheDocument();
    expect(screen.getByText(/alice@example.com/i)).toBeInTheDocument();
  });

  it("renders current password, new password, and confirm password fields", async () => {
    await loginAndReachChangePassword();
    const fields = getPasswordFields();
    expect(fields.currentPassword).toBeInTheDocument();
    expect(fields.newPassword).toBeInTheDocument();
    expect(fields.confirmPassword).toBeInTheDocument();
  });

  it("shows password strength checklist when typing new password", async () => {
    const user = await loginAndReachChangePassword();
    const { newPassword } = getPasswordFields();

    await user.type(newPassword, "ab");

    // Should show the checklist items
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one digit/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one special character/i)).toBeInTheDocument();
  });

  it("shows password mismatch feedback", async () => {
    const user = await loginAndReachChangePassword();
    const { newPassword, confirmPassword } = getPasswordFields();

    await user.type(newPassword, "NewPass123!");
    await user.type(confirmPassword, "Different123!");

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it("shows password match feedback when passwords match", async () => {
    const user = await loginAndReachChangePassword();
    const { newPassword, confirmPassword } = getPasswordFields();

    await user.type(newPassword, "NewPass123!");
    await user.type(confirmPassword, "NewPass123!");

    expect(screen.getByText(/passwords match/i)).toBeInTheDocument();
  });

  it("disables submit button when form is incomplete", async () => {
    await loginAndReachChangePassword();
    const submitBtn = screen.getByRole("button", { name: /change password/i });
    expect(submitBtn).toBeDisabled();
  });

  it("calls changePassword API and redirects to AppShell on success", async () => {
    const user = await loginAndReachChangePassword();
    const fields = getPasswordFields();

    mockChangePassword.mockResolvedValue({
      message: "Password changed successfully",
      token: "new-jwt-token",
      user: {
        id: 1,
        email: "alice@example.com",
        name: "Alice Johnson",
        role: "Requester",
        mustChangePassword: false,
      },
    });

    await user.type(fields.currentPassword, "Password123!");
    await user.type(fields.newPassword, "NewSecure1!");
    await user.type(fields.confirmPassword, "NewSecure1!");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith("test-jwt-token", "Password123!", "NewSecure1!");
    });

    // Should navigate to AppShell after successful password change
    await waitFor(() => {
      expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });
  });

  it("shows error when changePassword API fails", async () => {
    const user = await loginAndReachChangePassword();
    const fields = getPasswordFields();

    mockChangePassword.mockRejectedValue(new Error("Current password is incorrect"));

    await user.type(fields.currentPassword, "WrongPass!");
    await user.type(fields.newPassword, "NewSecure1!");
    await user.type(fields.confirmPassword, "NewSecure1!");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
    });
  });

  it("provides a sign-out escape button", async () => {
    await loginAndReachChangePassword();
    expect(screen.getByText(/sign out instead/i)).toBeInTheDocument();
  });
});
