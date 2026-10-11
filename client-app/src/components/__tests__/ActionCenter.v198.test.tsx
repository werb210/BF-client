// BF_CLIENT_ACTION_CENTER_v198
// BF_CLIENT_ACTION_CENTER_SHAPE_v206 + BF_CLIENT_NO_FALSE_ALL_CLEAR_v728
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiCall = vi.hoisted(() => vi.fn());
vi.mock("@/api/client", () => ({ apiCall }));
vi.mock("@/auth/token", () => ({ getToken: () => "test" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "http://localhost" } }));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: { applicationId: "app-1", applicationToken: "t" }, startNewApplication: vi.fn() }),
}));
vi.mock("@/native/appBadge", () => ({ setAppBadge: vi.fn(), clearAppBadge: vi.fn() }));
vi.mock("@/native/clientWidget", () => ({ updateClientWidget: vi.fn(), clearClientWidget: vi.fn(), actionLine: () => "" }));

import ActionCenter from "../ActionCenter";
import MiniPortalPage from "@/pages/MiniPortalPage";

type Item = { key: string; kind: "document" | "form" | "action"; label: string; urgent: boolean; action?: string };
const data = (outstanding: Item[], completed: Item[] = []) => ({ outstanding, completed, outstandingCount: outstanding.length });
const bank: Item = { key: "upload:bank_statements", kind: "document", label: "Bank statements", urgent: false };

beforeEach(() => {
  apiCall.mockReset();
});
afterEach(() => cleanup());

const actionCenterCalls = () => apiCall.mock.calls.filter((c) => String(c[0]).includes("/action-center"));

describe("action center", () => {
  it("renders the server's list as-is and never re-derives completion on the client", async () => {
    // The same key in both lists: the client must not decide on its own that it is done.
    apiCall.mockResolvedValue(data([bank], [{ ...bank }]));
    render(<ActionCenter applicationId="app 1" />);
    expect(await screen.findByText("Bank statements")).toBeTruthy();
    expect(screen.getByText("1 item remaining")).toBeTruthy();
    expect(actionCenterCalls()[0][0]).toBe("/api/client/documents-needed/action-center?applicationId=app%201");
  });

  it("says it could not load instead of blanking when the first call fails, and Try again reloads", async () => {
    apiCall.mockRejectedValueOnce(new Error("HTTP 500")).mockResolvedValueOnce(data([bank]));
    render(<ActionCenter applicationId="app-1" />);
    expect(await screen.findByTestId("action-center-failed")).toBeTruthy();
    fireEvent.click(screen.getByText("Try again"));
    expect(await screen.findByText("Bank statements")).toBeTruthy();
    expect(screen.queryByTestId("action-center-failed")).toBeNull();
  });

  it("keeps the last list when a refresh fails", async () => {
    apiCall.mockResolvedValueOnce(data([bank])).mockRejectedValueOnce(new Error("offline"));
    render(<ActionCenter applicationId="app-1" />);
    await screen.findByText("Bank statements");
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(actionCenterCalls().length).toBe(2));
    expect(screen.getByText("Bank statements")).toBeTruthy();
    expect(screen.queryByTestId("action-center-failed")).toBeNull();
  });

  it("tells the applicant plainly when a document was rejected", async () => {
    apiCall.mockResolvedValue(data([{ ...bank, urgent: true }]));
    render(<ActionCenter applicationId="app-1" />);
    expect(await screen.findByText(/the last one was not accepted/)).toBeTruthy();
  });

  it("refreshes when the tab regains focus, and stops listening once unmounted", async () => {
    apiCall.mockResolvedValue(data([bank]));
    const { unmount } = render(<ActionCenter applicationId="app-1" />);
    await screen.findByText("Bank statements");
    const before = actionCenterCalls().length;
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(actionCenterCalls().length).toBe(before + 1);
    unmount();
    window.dispatchEvent(new Event("focus"));
    expect(actionCenterCalls().length).toBe(before + 1);
  });

  it("stays quiet when there is genuinely nothing to show", async () => {
    apiCall.mockResolvedValue(data([], [bank]));
    const { container } = render(<ActionCenter applicationId="app-1" />);
    await waitFor(() => expect(actionCenterCalls().length).toBe(1));
    await act(async () => { await Promise.resolve(); });
    expect(container.innerHTML).toBe("");
  });
});

describe("a response of the wrong shape", () => {
  it("is rejected rather than read blindly: no crash, it says it could not load", async () => {
    // The v198 crash: apiCall resolved with another endpoint's payload, so
    // data.outstanding was undefined and .length threw inside render.
    for (const wrong of [{ items: [] }, { outstanding: [bank] }, null, "nope"]) {
      apiCall.mockReset();
      apiCall.mockResolvedValue(wrong);
      render(<ActionCenter applicationId="app-1" />);
      expect(await screen.findByTestId("action-center-failed")).toBeTruthy();
      cleanup();
    }
  });

  it("does not replace a good list with a malformed refresh", async () => {
    apiCall.mockResolvedValueOnce(data([bank])).mockResolvedValueOnce({ items: [] });
    const onData = vi.fn();
    render(<ActionCenter applicationId="app-1" onData={onData} />);
    await screen.findByText("Bank statements");
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(actionCenterCalls().length).toBe(2));
    expect(screen.getByText("Bank statements")).toBeTruthy();
    expect(onData).toHaveBeenCalledTimes(1);
  });
});

describe("mounting", () => {
  it("is on the mini portal, with the application id and the page's action handler", async () => {
    apiCall.mockImplementation(async (url: string) => {
      if (url.includes("/action-center")) {
        return data([{ key: "form:networth", kind: "form", label: "Personal net worth statement", urgent: false }]);
      }
      return {};
    });
    render(
      <MemoryRouter initialEntries={["/application/app-7"]}>
        <Routes><Route path="/application/:id" element={<MiniPortalPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("action-center")).toBeTruthy();
    expect(actionCenterCalls()[0][0]).toContain("applicationId=app-7");
    // The page's handler opens the form the item names.
    fireEvent.click(screen.getByText("Fill in"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  });
});
