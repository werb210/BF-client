// BF_CLIENT_OTP_ATTRIBUTION_v1 - the wizard path is unchanged: Step1_KYC still
// attaches attribution to its own start call, which covers the case where the
// wizard mints the row because no OTP mint happened first.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const fetchMock = vi.fn();
const getAttribution = vi.hoisted(() => vi.fn());

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
    update: vi.fn(),
    autosaveError: null as string | null,
  }),
}));
vi.mock("../../lib/attribution", () => ({ getAttribution }));
vi.mock("../../wizard/saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));
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

import { Step1_KYC } from "../../wizard/Step1_KYC";

const START = "/api/public/application/start";

describe("the wizard path is unchanged", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    navigateMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes(START)
        ? { ok: true, status: 200, json: async () => ({ data: { applicationId: "550e8400-e29b-41d4-a716-446655440000" } }) }
        : { ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("Step1_KYC still attaches attribution to its own start call", async () => {
    getAttribution.mockReturnValue({ gclid: "g-456" });
    await act(async () => { root.render(<Step1_KYC />); });
    const button = container.querySelector<HTMLButtonElement>('[data-testid="step1-continue"]');
    expect(button).not.toBeNull();
    await act(async () => { button!.click(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const start = fetchMock.mock.calls.filter((c) => String(c[0]).includes(START));
    expect(start).toHaveLength(1);
    const body = JSON.parse(String(start[0][1].body));
    expect(body.attribution).toEqual({ gclid: "g-456" });
    expect(body.source).toBe("client_direct");
  });
});
