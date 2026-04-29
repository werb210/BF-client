import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import Wizard from "../Wizard";

const navigateSpy = vi.fn();
const updateSpy = vi.fn();
const storeState = { currentStep: 1, applicationToken: "tok" } as any;

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/apply/step-3" }),
  useNavigate: () => navigateSpy,
}));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({
    app: storeState,
    update: (patch: any) => {
      updateSpy(patch);
      Object.assign(storeState, patch);
    },
    saveStepDraft: vi.fn(),
    submit: vi.fn(),
    reset: vi.fn(),
  }),
}));
vi.mock("@/state/offline", () => ({ OfflineStore: { load: () => ({ applicationToken: "tok" }) } }));
vi.mock("@/wizard/Step1_FinancialProfile", () => ({ default: () => <div>STEP 1</div> }));
vi.mock("@/wizard/Step2_ProductCategory", () => ({ default: () => <div>STEP 2</div> }));
vi.mock("@/wizard/Step3_BusinessDetails", () => ({ default: () => <div>STEP 3</div> }));
vi.mock("@/wizard/Step4_ApplicantInformation", () => ({ default: () => <div>STEP 4</div> }));
vi.mock("@/wizard/Step5_Documents", () => ({ default: () => <div>STEP 5</div> }));
vi.mock("@/wizard/Step6_TermsSignature", () => ({ default: () => <div>STEP 6</div> }));

describe("BF_CLIENT_WIZARD_NAV_FIX_v55b — navigation guard", () => {
  beforeEach(() => {
    storeState.currentStep = 1;
    updateSpy.mockReset();
    navigateSpy.mockReset();
  });

  it("updates store once from URL step", async () => {
    const root = createRoot(document.createElement("div"));
    await act(async () => {
      root.render(<Wizard />);
    });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith({ currentStep: 3 });
    root.unmount();
  });
});
