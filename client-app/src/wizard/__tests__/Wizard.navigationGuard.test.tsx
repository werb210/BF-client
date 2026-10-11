// BF_CLIENT_WIZARD_URL_SOT_v56_WIZARD_TEST_ANCHOR
// BF_CLIENT_v789_STEP_GUARD - the URL decides the step only when every earlier
// step is complete; otherwise the wizard goes to the first incomplete one.
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import Wizard from "../Wizard";
import type { ApplicationData } from "@/types/application";
import { completeApplication } from "@/test/fixtures/completeApplication";

const navigateSpy = vi.fn();
const updateSpy = vi.fn();
let pathname = "/apply/step-3";
let storeState: ApplicationData = completeApplication();

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname }),
  useNavigate: () => navigateSpy,
}));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({
    app: storeState,
    update: (patch: Partial<ApplicationData>) => {
      updateSpy(patch);
      storeState = { ...storeState, ...patch };
    },
  }),
}));
vi.mock("@/state/offline", () => ({ OfflineStore: { load: (): null => null } }));
vi.mock("@/api/clientApp", () => ({ ClientAppAPI: { update: vi.fn(async () => ({})) } }));
vi.mock("@/wizard/Step1_KYC", () => ({ default: () => <div data-testid="rendered-step">STEP 1</div> }));
vi.mock("@/wizard/Step2_Product", () => ({ default: () => <div data-testid="rendered-step">STEP 2</div> }));
vi.mock("@/wizard/Step3_Business", () => ({ default: () => <div data-testid="rendered-step">STEP 3</div> }));
vi.mock("@/wizard/Step4_Applicant", () => ({ default: () => <div data-testid="rendered-step">STEP 4</div> }));
vi.mock("@/wizard/Step5_Documents", () => ({ default: () => <div data-testid="rendered-step">STEP 5</div> }));
vi.mock("@/wizard/Step6_Review", () => ({ default: () => <div data-testid="rendered-step">STEP 6</div> }));

async function renderAt(path: string): Promise<string | null | undefined> {
  pathname = path;
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => {
    root.render(<Wizard />);
  });
  const text = host.querySelector('[data-testid="rendered-step"]')?.textContent;
  root.unmount();
  return text;
}

describe("wizard step guard", () => {
  beforeEach(() => {
    updateSpy.mockReset();
    navigateSpy.mockReset();
    storeState = completeApplication({ currentStep: 1 });
  });

  it("renders the step in the URL when every earlier step is complete", async () => {
    expect(await renderAt("/apply/step-3")).toBe("STEP 3");
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("updates the store once from the URL step", async () => {
    await renderAt("/apply/step-3");
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith({ currentStep: 3 });
  });

  it("sends a deep link to step 6 with nothing answered back to step 1", async () => {
    storeState = completeApplication({ currentStep: 1, kyc: {}, productCategory: null, selectedProductType: undefined, business: {}, applicant: {} });
    expect(await renderAt("/apply/step-6")).toBe("STEP 1");
    expect(navigateSpy).toHaveBeenCalledWith("/apply/step-1", { replace: true });
  });

  it("sends step 6 to step 4 when the SIN is missing", async () => {
    const app = completeApplication();
    storeState = { ...app, applicant: { ...app.applicant, ssn: "" } };
    expect(await renderAt("/apply/step-6")).toBe("STEP 4");
    expect(navigateSpy).toHaveBeenCalledWith("/apply/step-4", { replace: true });
  });

  it("sends step 5 to step 3 when the business address is missing", async () => {
    const app = completeApplication();
    storeState = { ...app, business: { ...app.business, address: "" } };
    expect(await renderAt("/apply/step-5")).toBe("STEP 3");
    expect(navigateSpy).toHaveBeenCalledWith("/apply/step-3", { replace: true });
  });

  it("sends step 3 to step 2 when no product category was chosen", async () => {
    storeState = completeApplication({ productCategory: null, selectedProductType: undefined });
    expect(await renderAt("/apply/step-3")).toBe("STEP 2");
  });

  it("opens step 6 for a complete application", async () => {
    expect(await renderAt("/apply/step-6")).toBe("STEP 6");
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
