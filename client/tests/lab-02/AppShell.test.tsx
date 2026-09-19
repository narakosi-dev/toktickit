import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";

// Mock the API module to control auth flow
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

import { loginUser, getMe } from "../../src/api.js";
const mockLoginUser = loginUser as ReturnType<typeof vi.fn>;
const mockGetMe = getMe as ReturnType<typeof vi.fn>;

const mockUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  role: "Requester",
  mustChangePassword: false,
};

/** Helper to log in and reach AppShell */
async function loginToAppShell() {
  const user = userEvent.setup();
  mockLoginUser.mockResolvedValue({
    token: "test-jwt-token",
    user: mockUser,
  });

  render(<App />);

  await user.type(screen.getByLabelText(/email address/i), "jennifer.anderson@example.com");
  await user.type(screen.getByLabelText(/^password$/i), "Password123!");
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  await waitFor(() => {
    expect(screen.getByText(/sign out/i)).toBeInTheDocument();
  });

  return user;
}

describe("AppShell Component (UI-02 / AC-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetMe.mockRejectedValue(new Error("No token"));
  });

  it("displays current user identity in header and Sign Out button", async () => {
    await loginToAppShell();

    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    expect(screen.getAllByText("Jennifer Anderson").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("jennifer.anderson@example.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("navigates between navigation tabs", async () => {
    await loginToAppShell();

    // Default tab is My Tickets
    const myTicketsBtn = screen.getByRole("button", { name: /My Tickets/i });
    fireEvent.click(myTicketsBtn);
    expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();

    const createTicketBtn = screen.getByRole("button", { name: /Create Ticket/i });
    fireEvent.click(createTicketBtn);
    expect(screen.getByRole("heading", { name: /Create IT Support Ticket/i })).toBeInTheDocument();
  });
});
