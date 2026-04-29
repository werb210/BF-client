/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import Wizard from "../Wizard";
const navigateSpy = vi.fn();
const updateSpy = vi.fn();
const storeState: { currentStep: number; applicationToken: string } = { currentStep: 2, applicationToken: "22222222-2222-4222-8222-222222222222" };
vi.mock("react-router-dom", () => ({ useLocation: () => ({ pathname: "/apply/step-3" }), useNavigate: () => navigateSpy }));
vi.mock("@/state/useApplicationStore", () => ({ useApplicationStore: () => ({ app: storeState, update: (patch: Partial<typeof storeState>) => { updateSpy(patch); Object.assign(storeState, patch);} }) }));
vi.mock("@/state/offline", () => ({ OfflineStore: { load: () => ({ applicationToken: "22222222-2222-4222-8222-222222222222" }) } }));
vi.mock("@/wizard/Step1_FinancialProfile", () => ({ default: () => <div data-testid="rendered-step">STEP 1</div> }));
vi.mock("@/wizard/Step2_ProductCategory", () => ({ default: () => <div data-testid="rendered-step">STEP 2</div> }));
vi.mock("@/wizard/Step3_BusinessDetails", () => ({ default: () => <div data-testid="rendered-step">STEP 3</div> }));
vi.mock("@/wizard/Step4_ApplicantInformation", () => ({ default: () => <div data-testid="rendered-step">STEP 4</div> }));
vi.mock("@/wizard/Step5_Documents", () => ({ default: () => <div data-testid="rendered-step">STEP 5</div> }));
vi.mock("@/wizard/Step6_TermsSignature", () => ({ default: () => <div data-testid="rendered-step">STEP 6</div> }));
describe("BF_CLIENT_WIZARD_URL_SOT_v56 — URL is source of truth", () => {
  beforeEach(() => { storeState.currentStep = 2; storeState.applicationToken = "22222222-2222-4222-8222-222222222222"; updateSpy.mockReset(); navigateSpy.mockReset();});
  it("renders the URL-specified step even when the store disagrees", async () => { const div=document.createElement("div"); const root=createRoot(div); await act(async()=>{root.render(<Wizard />);}); expect(div.querySelector('[data-testid="rendered-step"]')?.textContent).toBe("STEP 3"); root.unmount(); });
  it("mirrors the URL into the store via update()", async () => { const div=document.createElement("div"); const root=createRoot(div); await act(async()=>{root.render(<Wizard />);}); expect(updateSpy).toHaveBeenCalledWith({ currentStep: 3 }); root.unmount();});
  it("never calls navigate() (no store→URL race)", async () => { const div=document.createElement("div"); const root=createRoot(div); await act(async()=>{root.render(<Wizard />);}); expect(navigateSpy).not.toHaveBeenCalled(); root.unmount();});
});
// BF_CLIENT_WIZARD_URL_SOT_v56_WIZARD_TEST_ANCHOR
