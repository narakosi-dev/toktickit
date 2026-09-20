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

import { loginUser, getMe, logoutUser } from "../../src/api.js";
const mockLoginUser = loginUser as ReturnType<typeof vi.fn>;
const mockGetMe = getMe as ReturnType<typeof vi.fn>;
const mockLogoutUser = logoutUser as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockGetMe.mockRejectedValue(new Error("No token"));
});

describe("Login Component", () => {
  it("renders the login form with email, password inputs and submit button", async () => {
    render(<App />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders TokTickIT branding", async () => {
    render(<App />);
    expect(screen.getByText(/IT Service Desk/i)).toBeInTheDocument();
  });

  it("shows demo quick-login buttons for three roles", async () => {
    render(<App />);
    expect(screen.getByText(/requester/i, { selector: "button" })).toBeInTheDocument();
    expect(screen.getByText(/it staff/i, { selector: "button" })).toBeInTheDocument();
    expect(screen.getByText(/administrator/i, { selector: "button" })).toBeInTheDocument();
  });

  it("shows validation error when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<App />);

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    await user.click(submitBtn);

    expect(screen.getByText(/please enter both email and password/i)).toBeInTheDocument();
  });

  it("calls loginUser API and navigates to AppShell on success", async () => {
    const user = userEvent.setup();
    mockLoginUser.mockResolvedValue({
      token: "test-jwt-token",
      user: {
        id: 1,
        email: "alice@example.com",
        name: "Alice",
        role: "Requester",
        mustChangePassword: false,
      },
    });

    render(<App />);

    await user.type(screen.getByLabelText(/email address/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith("alice@example.com", "Password123!");
    });

    // Should navigate to AppShell — check for Sign Out button
    await waitFor(() => {
      expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });
  });

  it("shows error message on login failure", async () => {
    const user = userEvent.setup();
    mockLoginUser.mockRejectedValue(new Error("Invalid email or password"));

    render(<App />);

    await user.type(screen.getByLabelText(/email address/i), "wrong@example.com");
    await user.type(screen.getByLabelText(/password/i), "badpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it("shows error message for deactivated account", async () => {
    const user = userEvent.setup();
    mockLoginUser.mockRejectedValue(new Error("Account has been deactivated. Please contact IT Administrator."));

    render(<App />);

    await user.type(screen.getByLabelText(/email address/i), "inactive@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/account has been deactivated/i)).toBeInTheDocument();
    });
  });

  it("redirects to ChangePassword when mustChangePassword is true", async () => {
    const user = userEvent.setup();
    mockLoginUser.mockResolvedValue({
      token: "test-jwt-token",
      user: {
        id: 1,
        email: "alice@example.com",
        name: "Alice",
        role: "Requester",
        mustChangePassword: true,
      },
    });

    render(<App />);

    await user.type(screen.getByLabelText(/email address/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/change your password/i)).toBeInTheDocument();
    });
  });

  it("populates email field when clicking demo quick-login button", async () => {
    const user = userEvent.setup();
    render(<App />);

    const adminBtn = screen.getByText(/administrator/i, { selector: "button" });
    await user.click(adminBtn);

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(emailInput.value).toBe("admin@toktickit.com");
  });
});
