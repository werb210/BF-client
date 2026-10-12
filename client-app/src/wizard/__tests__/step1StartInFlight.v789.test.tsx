/* @vitest-environment jsdom */
// BF_CLIENT_v789_START_IN_FLIGHT - three fast taps on Continue send exactly one
// POST /api/public/application/start, and the button is disabled while it runs.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updateMock = vi.fn();
const navigateMock = vi.fn();
const fetchMock = vi.fn();

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
        monthlyRevenue: "$50,000 to $100,000",
      },
      business: {},
      applicant: {},
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
vi.mock("../../lender/productSync", () => ({ ProductSync: { load: (): unknown[] => [], sync: async (): Promise<unknown[]> => [] } }));

import { Step1_KYC } from "../Step1_KYC";

const START = "/api/public/application/start";

function startCalls() {
  return fetchMock.mock.calls.filter((args) => String(args[0]).includes(START));
}

describe("Step 1 Continue: one application per click sequence", () => {
  let container: HTMLDivElement;
  let root: Root;
  let resolveStart: (value: unknown) => void = () => undefined;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    updateMock.mockReset();
    navigateMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes(START)) {
        return new Promise((resolve) => {
          resolveStart = resolve;
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("three rapid clicks send one start request and disable the button until it answers", async () => {
    await act(async () => { root.render(<Step1_KYC />); });
    const button = () => container.querySelector<HTMLButtonElement>('[data-testid="step1-continue"]');
    expect(button()).not.toBeNull();
    expect(button()!.disabled).toBe(false);

    // Three taps in the same tick: no render between them.
    await act(async () => {
      button()!.click();
      button()!.click();
      button()!.click();
    });
    expect(startCalls()).toHaveLength(1);
    expect(button()!.disabled).toBe(true);
    expect(button()!.textContent).toMatch(/Starting your application/);

    // More taps while the request is still running change nothing.
    await act(async () => { button()!.click(); });
    expect(startCalls()).toHaveLength(1);

    await act(async () => {
      resolveStart({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", data: { applicationId: "550e8400-e29b-41d4-a716-446655440000" } }),
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(startCalls()).toHaveLength(1);
    expect(navigateMock).toHaveBeenCalledWith("/apply/step-2");
  });

  it("re-enables the button after a failed start so the applicant can try again", async () => {
    await act(async () => { root.render(<Step1_KYC />); });
    const button = () => container.querySelector<HTMLButtonElement>('[data-testid="step1-continue"]')!;
    await act(async () => { button().click(); });
    await act(async () => {
      resolveStart({ ok: false, status: 500, json: async () => ({}) });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(button().disabled).toBe(false);
    await act(async () => { button().click(); });
    expect(startCalls()).toHaveLength(2);
  });
});
