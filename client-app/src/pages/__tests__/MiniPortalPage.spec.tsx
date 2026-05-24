import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/api/client", () => ({ apiCall: vi.fn(async () => ({ items: [] })) }));
vi.mock("@/auth/token", () => ({ getToken: () => "test" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "http://localhost" } }));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: { applicationId: "app-1", applicationToken: "t" }, reset: vi.fn() }),
}));

import MiniPortalPage from "../MiniPortalPage";

describe("MiniPortalPage", () => {
  it("renders the 6-stage tracker in locked order", () => {
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    const labels = Array.from(document.querySelectorAll(".mp-stage__label")).map((n) => n.textContent);
    expect(labels).toEqual(["Received", "In Review", "Documents Required", "Additional Steps Required", "Off to Lender", "Offer"]);
  });

  it("opens Personal Net Worth modal when chip is clicked", () => {
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Personal Net Worth" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Personal Net Worth Form")).toBeTruthy();
  });
  it("renders the action chips", () => {
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    const chips = Array.from(document.querySelectorAll(".mp-chip")).map((n) => n.textContent);
    expect(chips).toContain("Upload Documents");
    expect(chips).toContain("Personal Net Worth");
    expect(chips).toContain("Other Forms");
  });
});
