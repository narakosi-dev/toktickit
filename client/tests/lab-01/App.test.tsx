import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App.js";

import * as api from "../../src/api.js";
import { fireEvent, waitFor } from "@testing-library/react";

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
    vi.spyOn(api, "checkSystem").mockResolvedValue({ online: true, categories: mockCategories });

    render(<App />);
    const btn = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(btn);

    expect(screen.getAllByText(/⏳ Loading…/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Network Error"));

    render(<App />);
    const btn = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });
});
