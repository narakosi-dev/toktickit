import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App.js";

import * as api from "../../src/api.js";
import { fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock auth API to auto-login for Lab 1 regression tests
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return {
    ...actual,
    loginUser: vi.fn(),
    logoutUser: vi.fn().mockResolvedValue(undefined),
    getMe: vi.fn(),
    changePassword: vi.fn(),
    checkSystem: vi.fn(),
  };
});

import { loginUser, getMe, checkSystem } from "../../src/api.js";
const mockLoginUser = loginUser as ReturnType<typeof vi.fn>;
const mockGetMe = getMe as ReturnType<typeof vi.fn>;
const mockCheckSystem = checkSystem as ReturnType<typeof vi.fn>;

/** Helper: Log in and navigate to System Status tab */
async function loginAndNavigateToSystemStatus() {
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

  // Login
  await user.type(screen.getByLabelText(/email address/i), "alice@example.com");
  await user.type(screen.getByLabelText(/^password$/i), "Password123!");
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  // Wait for AppShell to render
  await waitFor(() => {
    expect(screen.getByText(/sign out/i)).toBeInTheDocument();
  });

  // Navigate to System Status tab
  const systemStatusBtn = screen.getByRole("button", { name: /system status/i });
  await user.click(systemStatusBtn);

  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockGetMe.mockRejectedValue(new Error("No token"));
});

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — write these yourself. Hint: mock the api module with
  // vi.spyOn(api, "checkSystem").mockResolvedValue(...) / .mockRejectedValue(...)
  // then click the button and assert the Online list / Offline message.
  it("shows Online and the seeded categories on success", async () => {
    const mockCategories = [
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
    ];
    mockCheckSystem.mockResolvedValue({ online: true, categories: mockCategories });

    await loginAndNavigateToSystemStatus();

    const btn = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    mockCheckSystem.mockRejectedValue(new Error("Network Error"));

    await loginAndNavigateToSystemStatus();

    const btn = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });
});
