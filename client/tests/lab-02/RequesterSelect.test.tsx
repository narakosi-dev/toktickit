import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequesterSelect from "../../src/components/RequesterSelect.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

const mockRequesters: api.Requester[] = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", active: true },
  { id: 2, name: "Michael Brown", email: "michael.brown@example.com", active: true },
];

describe("RequesterSelect Component (UI-01 / AC-01, AC-02)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders active requesters in dropdown and allows selecting", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(
      <RequesterProvider>
        <RequesterSelect />
      </RequesterProvider>
    );

    // Shows loading initially
    expect(screen.getByText(/Loading active requesters/i)).toBeInTheDocument();

    // After loading, shows title and dropdown options
    await waitFor(() => {
      expect(screen.getByText(/Select Development Requester/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Jennifer Anderson/i)).toBeInTheDocument();
    expect(screen.getByText(/Michael Brown/i)).toBeInTheDocument();
    expect(screen.getByText(/Authentication coming in Lab 3/i)).toBeInTheDocument();

    // Continue button is enabled
    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    expect(continueBtn).not.toBeDisabled();
  });

  it("shows an error state with retry button when API fails", async () => {
    vi.spyOn(api, "fetchRequesters").mockRejectedValue(new Error("Network Error"));

    render(
      <RequesterProvider>
        <RequesterSelect />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Unable to load active development requesters/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });
});
