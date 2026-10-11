// BF_CLIENT_FEE_AGREEMENT_v709
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiCall = vi.fn();
vi.mock("../../api/client", () => ({ apiCall: (...a: unknown[]) => apiCall(...a) }));
vi.mock("@/auth/token", () => ({ getToken: () => "test" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "http://localhost" } }));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: { applicationId: "app-1", applicationToken: "t" }, startNewApplication: vi.fn() }),
}));
vi.mock("@/native/appBadge", () => ({ setAppBadge: vi.fn(), clearAppBadge: vi.fn() }));
vi.mock("@/native/clientWidget", () => ({ updateClientWidget: vi.fn(), clearClientWidget: vi.fn(), actionLine: () => "" }));

import FeeAgreementSignModal from "../FeeAgreementSignModal";
import MiniPortalPage from "@/pages/MiniPortalPage";

beforeEach(() => { apiCall.mockReset(); });

describe("fee agreement signing window", () => {
  it("opens the embedded signing link from the server", async () => {
    apiCall.mockResolvedValueOnce({ status: "ready", url: "https://app.signnow.com/x" });
    render(<FeeAgreementSignModal applicationId="app-1" open onClose={() => {}} onSigned={() => {}} />);
    await waitFor(() => expect(screen.getByTitle("Sign your fee agreement")).toBeTruthy());
    expect(apiCall.mock.calls[0][0]).toBe("/api/client/fee-agreement/session?applicationId=app-1");
  });

  it("says who signs when another director was emailed", async () => {
    apiCall.mockResolvedValueOnce({ status: "other_signer", signerName: "Pat Lee" });
    render(<FeeAgreementSignModal applicationId="app-1" open onClose={() => {}} onSigned={() => {}} />);
    await waitFor(() => expect(screen.getByText(/signed by Pat Lee/)).toBeTruthy());
  });

  it("asks the server to confirm with SignNow on close, and reports signed", async () => {
    apiCall.mockResolvedValueOnce({ status: "ready", url: "https://app.signnow.com/x" }).mockResolvedValueOnce({ ok: true, signed: true });
    const onSigned = vi.fn();
    const onClose = vi.fn();
    render(<FeeAgreementSignModal applicationId="app-1" open onClose={onClose} onSigned={onSigned} />);
    await waitFor(() => expect(screen.getByTitle("Sign your fee agreement")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(onSigned).toHaveBeenCalled());
    expect(apiCall.mock.calls[1][0]).toBe("/api/client/fee-agreement/complete?applicationId=app-1");
  });

  it("renders nothing when closed", () => {
    const { container } = render(<FeeAgreementSignModal applicationId="app-1" open={false} onClose={() => {}} onSigned={() => {}} />);
    expect(container.innerHTML).toBe("");
    expect(apiCall).not.toHaveBeenCalled();
  });

  it("the mini-portal opens it from a sign_fee_agreement button", async () => {
    apiCall.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/client/messages?")) {
        return [{ id: "m1", direction: "outbound", body: "Please sign the fee agreement.", cta_label: "Review and sign", cta_action: "sign_fee_agreement" }];
      }
      if (url.startsWith("/api/client/fee-agreement/session")) return { status: "ready", url: "https://app.signnow.com/fee" };
      return {};
    });
    render(
      <MemoryRouter initialEntries={["/application/app-1"]}>
        <Routes><Route path="/application/:id" element={<MiniPortalPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByTitle("Sign your fee agreement")).toBeNull();
    fireEvent.click(await screen.findByText("Review and sign"));
    await waitFor(() => expect(screen.getByTitle("Sign your fee agreement")).toBeTruthy());
    expect(apiCall.mock.calls.map((c) => c[0])).toContain("/api/client/fee-agreement/session?applicationId=app-1");
  });

  it("the mini-portal opens it from the to-do item whose action is sign_fee_agreement", async () => {
    apiCall.mockImplementation(async (url: string) => {
      if (url.includes("/action-center")) {
        return { outstanding: [{ key: "fee_agreement", kind: "action", label: "Sign your fee agreement", urgent: false, action: "sign_fee_agreement" }], completed: [], outstandingCount: 1 };
      }
      if (url.startsWith("/api/client/fee-agreement/session")) return { status: "ready", url: "https://app.signnow.com/fee" };
      return {};
    });
    render(
      <MemoryRouter initialEntries={["/application/app-1"]}>
        <Routes><Route path="/application/:id" element={<MiniPortalPage />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId("action-center");
    fireEvent.click(screen.getByText("Open"));
    await waitFor(() => expect(screen.getByTitle("Sign your fee agreement")).toBeTruthy());
  });
});
