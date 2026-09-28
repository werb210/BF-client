import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/api/client", () => ({ apiCall: vi.fn(async () => ({ items: [] })) }));
vi.mock("@/auth/token", () => ({ getToken: () => "test" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "http://localhost" } }));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: { applicationId: "app-1", applicationToken: "t" }, reset: vi.fn() }),
}));

import { apiCall } from "@/api/client";
import MiniPortalPage from "../MiniPortalPage";

describe("MiniPortalPage", () => {
  beforeEach(() => {
    (apiCall as any).mockReset();
    (apiCall as any).mockImplementation(async () => ({ items: [] as any[] }));
  });

  it("renders the 6-stage tracker in locked order", () => {
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    const labels = Array.from(document.querySelectorAll(".mp-stage__label")).map((n) => n.textContent);
    expect(labels).toEqual(["Received", "In Review", "Documents Required", "Additional Steps Required", "Off to Lender", "Offer"]);
  });

  it("opens the Personal Net Worth Statement modal when chip is clicked", () => {
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Personal Net Worth Statement" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getAllByText("Personal Statement of Affairs").length).toBeGreaterThan(0);
  });
  it("renders the action chips", () => {
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    const chips = Array.from(document.querySelectorAll(".mp-chip")).map((n) => n.textContent);
    // BF_CLIENT_CMP_LAYOUT_v631 - the five always-on chips; CRA / Connect Bank / collateral
    // only when staff request them (none requested in the default mock).
    expect(chips).toEqual(expect.arrayContaining(["Upload Documents", "New Application", "Personal Net Worth Statement", "Debt Stack", "Professional Advisors"]));
    expect(chips).not.toContain("CRA Authorization");
    expect(chips).not.toContain("Connect Bank (View-Only)");
  });

  // BF_CLIENT_CMP_LAYOUT_v631 - Upload Documents is one of the always-on What's Next chips.
  it("shows the Upload Documents chip in What's Next", async () => {
    (apiCall as any).mockImplementation(async (url: string) => {
      if (typeof url === "string" && url.includes("/documents-needed/needed")) {
        return { stillNeeded: [{ document_type: "bank_statements", label: "Bank statements" }], rejected: [] as any[] };
      }
      return { items: [] as any[] };
    });
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    await waitFor(() => {
      const chips = Array.from(document.querySelectorAll(".mp-chip")).map((n) => n.textContent);
      expect(chips).toContain("New Application");
      expect(chips).toContain("Upload Documents");
    });
  });
});
