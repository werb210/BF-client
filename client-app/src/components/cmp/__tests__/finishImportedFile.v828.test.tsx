// BF_CLIENT_v828_FINISH_IMPORTED_FILE - a file Boreal prepared from documents the client gave a broker or lender shows
// in the application switcher, and Continue takes it over and opens the wizard pre-filled.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({ apiCall: vi.fn(), setToken: vi.fn(), reconcile: vi.fn(), apply: vi.fn() }));
vi.mock("@/api/client", () => ({ apiCall: h.apiCall }));
vi.mock("@/auth/applicationToken", () => ({ setApplicationToken: h.setToken }));
vi.mock("@/state/useApplicationStore", () => ({ reconcileWithBootToken: h.reconcile, useApplicationStore: () => ({}) }));
vi.mock("@/wizard/brokerPrefill", () => ({ applyBrokerImport: h.apply }));

import { AppSwitcherSheet, toSwitcherApp } from "../CmpHome";
import { openPreparedApplication } from "../openPrepared";

beforeEach(() => { for (const f of Object.values(h)) f.mockReset(); });

const prepared = { id: "app1", pipeline_state: "draft", submitted_at: null as string | null, business_name: "Northwind Grocery Ltd", product_category: "standard",
  requested_amount: "250000", updated_at: "2026-10-19T20:00:00Z", ready_to_finish: true };

describe("a prepared file in the switcher", () => {
  it("is listed by business name, ready to finish", () => {
    const app = toSwitcherApp(prepared);
    expect(app).toMatchObject({ id: "app1", business: "Northwind Grocery Ltd", notFinished: true, readyToFinish: true, amount: "$250,000" });
    expect(toSwitcherApp({ ...prepared, ready_to_finish: false }).readyToFinish).toBe(false);
    const onContinue = vi.fn();
    render(<AppSwitcherSheet apps={[app]} currentId="other" onPick={vi.fn()} onContinue={onContinue} onClose={vi.fn()} />);
    expect(screen.getByText("Ready for you to check and finish")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledWith("app1");
  });

  it("Continue takes it over and opens the wizard pre-filled", async () => {
    const prefill = { business: { legalName: "Northwind Grocery Ltd" } };
    h.apiCall.mockResolvedValue({ ok: true, applicationId: "app1", brokerImport: true, brokerPrefill: prefill, brokerName: "the documents you provided" });
    const navigate = vi.fn();
    await openPreparedApplication("app1", navigate);
    expect(h.apiCall).toHaveBeenCalledWith("/api/client/applications/app1/claim-import", { method: "POST", body: {} });
    expect(h.setToken).toHaveBeenCalledWith("app1");
    expect(h.apply).toHaveBeenCalledWith("app1", prefill, "the documents you provided");
    expect(navigate).toHaveBeenCalledWith("/apply/step-1");
  });

  it("does not open the wizard when the server refuses", async () => {
    h.apiCall.mockRejectedValue(new Error("not_found"));
    const navigate = vi.fn();
    await expect(openPreparedApplication("app1", navigate)).rejects.toThrow("not_found");
    expect(navigate).not.toHaveBeenCalled();
  });
});
