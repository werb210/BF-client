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

  // BF_CLIENT_v807_TABLET - the portal is the new design at every width: a stage card on Home, and the forms
  // and uploads on the More tab (was the 6-dot tracker and the "What's Next" chips on computers).
  it("shows the stage card, with no step count", () => {
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    expect(screen.getByText("What stage is your application at?")).toBeTruthy();
    expect(screen.getByTestId("cmp-status-stage").textContent).toBe("Received");
    expect(screen.getByTestId("cmp-status").textContent).not.toMatch(/Step \d of \d/);
    expect(document.querySelector(".mp-stage__label")).toBeNull();
  });

  it("opens the Personal Net Worth Statement form from More", () => {
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("cmp-tab-more"));
    fireEvent.click(screen.getByTestId("cmp-more-form-networth"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getAllByText("Personal Statement of Affairs").length).toBeGreaterThan(0);
  });

  it("lists the always-on forms, and not CRA or Connect Bank unless staff request them", () => {
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    const more = screen.getByTestId("cmp-more");
    expect(more.textContent).toContain("Personal Net Worth Statement");
    expect(more.textContent).toContain("Debt Stack");
    expect(more.textContent).toContain("Professional Advisors");
    expect(more.textContent).toContain("Start a new application");
    expect(more.textContent).not.toContain("CRA Authorization");
    expect(more.textContent).not.toContain("Connect Bank");
  });

  it("offers Upload documents on More, marked needed when documents are outstanding", async () => {
    (apiCall as any).mockImplementation(async (url: string) => {
      if (typeof url === "string" && url.includes("/documents-needed/needed")) {
        return { stillNeeded: [{ document_type: "bank_statements", label: "Bank statements" }], rejected: [] as any[] };
      }
      return { items: [] as any[] };
    });
    render(<MemoryRouter initialEntries={["/portal/app-1"]}><MiniPortalPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("cmp-more-upload").textContent).toContain("Needed"));
  });
});
