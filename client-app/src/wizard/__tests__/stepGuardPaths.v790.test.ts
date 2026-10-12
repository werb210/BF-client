// BF_CLIENT_v790_STEP_GUARD_PATHS
// The URL guard must respect the wizard's conditional paths: a step the
// applicant's choices skip never blocks, and the guard never sends anyone to a
// skipped step. One case per path, walking the real rules.
import { describe, expect, it } from "vitest";
import { firstIncompleteStepBefore, incompleteStepsForSubmit } from "../stepValidation";
import { isMediaWizardPath, isSbaWizardPath, isStartupPathKyc } from "../wizardSchema";
import { completeApplication } from "@/test/fixtures/completeApplication";

describe("step guard on every wizard path", () => {
  it("standard path: Step 6 opens once 1-5 pass; an empty Step 3 sends the applicant to Step 3", () => {
    const app = completeApplication();
    expect(firstIncompleteStepBefore(app, 6)).toBeNull();
    expect(firstIncompleteStepBefore({ ...app, business: {} }, 6)).toBe(3);
  });

  it("media path: no employees or yearly revenue on Step 3, and Step 3 still guards when empty", () => {
    const base = completeApplication({ productCategory: "MEDIA", selectedProductType: "MEDIA" });
    const app = {
      ...base,
      kyc: { ...base.kyc, purposeOfFunds: "Media Financing", industry: "Media, movies, TV shows, video game production", monthlyRevenue: "" },
      business: { ...base.business, employees: "", estimatedRevenue: "" },
    };
    expect(isMediaWizardPath(app)).toBe(true);
    expect(firstIncompleteStepBefore(app, 6)).toBeNull();
    expect(firstIncompleteStepBefore({ ...app, business: {} }, 6)).toBe(3);
  });

  it("SBA path: Step 5 is skipped, so Step 6 opens straight from a complete Step 4", () => {
    const app = completeApplication({ productCategory: "SBA", selectedProductType: "SBA", documentsDeferred: false, documents: {} });
    expect(isSbaWizardPath(app)).toBe(true);
    expect(firstIncompleteStepBefore(app, 6)).toBeNull();
    // Step 3 asks only optional questions on SBA, so an empty Step 3 never blocks.
    expect(firstIncompleteStepBefore({ ...app, business: {} }, 6)).toBeNull();
    // Step 4 is still required.
    expect(firstIncompleteStepBefore({ ...app, applicant: { ...app.applicant, ssn: "" } }, 6)).toBe(4);
  });

  it("startup path (US SBA / Start-up): the revenue and industry questions on Step 1 never block", () => {
    const base = completeApplication();
    const app = { ...base, kyc: { ...base.kyc, businessLocation: "United States", purposeOfFunds: "SBA / Start-up", industry: "", monthlyRevenue: "" } };
    expect(isStartupPathKyc(app.kyc)).toBe(true);
    expect(firstIncompleteStepBefore(app, 6)).toBeNull();
    expect(incompleteStepsForSubmit(app)).toEqual([]);
  });

  it("a deep link never lands on a later step than the first incomplete one", () => {
    const app = completeApplication();
    const step1Blank = { ...app, kyc: {} };
    expect(firstIncompleteStepBefore(step1Blank, 6)).toBe(1);
    expect(firstIncompleteStepBefore(step1Blank, 1)).toBeNull();
  });
});
