/* @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMock = vi.fn();
const navigateMock = vi.fn();
const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);
(import.meta as any).env = { ...(import.meta as any).env, VITE_API_URL: "https://server.boreal.financial" };

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => navigateMock,
  useParams: () => ({}),
}));
vi.mock("../../state/useApplicationStore", () => ({
  useApplicationStore: () => ({
    app: {
      currentStep: 1,
      kyc: {
        lookingFor: "WORKING_CAPITAL",
        businessLocation: "Canada",
        fundingAmount: "250000",
        purposeOfFunds: "Working Capital",
        industry: "Real Estate",
        salesHistory: "Over 3 Years",
        revenueLast12Months: "$1,000,001 to $3,000,000",
        monthlyRevenue: "$50,000 to $100,000",
        accountsReceivable: "$500,000 to $1,000,000",
        fixedAssets: "Over $500,000",
      },
      applicationToken: null as string | null,
      applicationId: null as string | null,
    },
    update: updateMock,
    autosaveError: null as string | null,
  }),
}));
vi.mock("../saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));
vi.mock("../../utils/track", () => ({ track: vi.fn() }));
vi.mock("../../utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("../../client/autosave", () => ({
  saveStepData: vi.fn(),
  loadStepData: vi.fn(() => null),
  mergeDraft: (a: unknown) => a,
  clearDraft: vi.fn(),
}));
vi.mock("../../schemas/v1WizardSchema", () => ({ enforceV1StepSchema: vi.fn() }));
vi.mock("../../utils/parseCurrency", () => ({ parseCurrency: () => 250000 }));
vi.mock("../buildMatchPercentages", () => ({ buildMatchPercentages: () => ({}) }));

import { Step1_KYC } from "../Step1_KYC";

describe("Step 1 public draft start (Block 12)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    updateMock.mockReset();
    navigateMock.mockReset();
    fetchMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("calls POST /api/public/application/start and stores returned UUID", async () => {
    const realUuid = "550e8400-e29b-41d4-a716-446655440000";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok", data: { applicationId: realUuid, reused: false } }),
    });

    await act(async () => { root.render(<Step1_KYC />); });
    await act(async () => { await Promise.resolve(); });

    const continueBtn = Array.from(container.querySelectorAll("button"))
      .find((b) => /Continue/i.test(b.textContent || ""));
    if (!continueBtn) throw new Error("Continue button not rendered");
    await act(async () => { continueBtn.click(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOpts] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toContain("/api/public/application/start");
    expect((calledOpts as RequestInit).method).toBe("POST");

    const stored = updateMock.mock.calls.find(
      (args) => args[0] && (args[0] as Record<string, unknown>).applicationToken === realUuid
    );
    expect(stored).toBeTruthy();
    expect(navigateMock).toHaveBeenCalledWith("/apply/step-2");

    root.unmount();
    container.remove();
  });

  it("does not navigate if response is 4xx", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "validation_error" }),
    });

    await act(async () => { root.render(<Step1_KYC />); });
    await act(async () => { await Promise.resolve(); });

    const continueBtn = Array.from(container.querySelectorAll("button"))
      .find((b) => /Continue/i.test(b.textContent || ""));
    if (!continueBtn) throw new Error("Continue button not rendered");
    await act(async () => { continueBtn.click(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(navigateMock).not.toHaveBeenCalled();

    root.unmount();
    container.remove();
  });
});
