import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AppShell from "../../src/components/AppShell.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  active: true,
};

describe("AppShell Component (UI-02 / AC-03)", () => {
  beforeEach(() => {
    localStorage.setItem("toktickit_selected_requester", JSON.stringify(mockRequester));
  });

  it("displays current requester identity in header and Change Requester button", () => {
    render(
      <RequesterProvider>
        <AppShell />
      </RequesterProvider>
    );

    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("jennifer.anderson@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change Requester/i })).toBeInTheDocument();
  });

  it("navigates between navigation tabs", () => {
    render(
      <RequesterProvider>
        <AppShell />
      </RequesterProvider>
    );

    const myTicketsBtn = screen.getByRole("button", { name: /My Tickets/i });
    fireEvent.click(myTicketsBtn);
    expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();

    const createTicketBtn = screen.getByRole("button", { name: /Create Ticket/i });
    fireEvent.click(createTicketBtn);
    expect(screen.getByRole("heading", { name: /Create IT Support Ticket/i })).toBeInTheDocument();
  });
});
