// BF_CLIENT_FEE_AGREEMENT_v709
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const apiCall = vi.fn();
vi.mock("../../api/client", () => ({ apiCall: (...a: unknown[]) => apiCall(...a) }));

import FeeAgreementSignModal from "../FeeAgreementSignModal";

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

  it("the mini-portal opens it from the to-do action sign_fee_agreement", () => {
    const src = readFileSync(join(process.cwd(), "src/pages/MiniPortalPage.tsx"), "utf-8");
    expect(src).toContain('ctaAction === "sign_fee_agreement"');
    expect(src).toContain("<FeeAgreementSignModal");
  });
});
