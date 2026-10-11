// BF_CLIENT_v789_STEP_GUARD - the shared step-completeness rules.
import { describe, expect, it } from "vitest";
import {
  describeIncompleteStep,
  firstIncompleteStepBefore,
  incompleteStepsForSubmit,
  missingForStep,
  step1FieldErrors,
} from "../stepValidation";
import { completeApplication } from "@/test/fixtures/completeApplication";

describe("step completeness", () => {
  it("a complete application passes steps 1-5", () => {
    const app = completeApplication();
    for (const step of [1, 2, 3, 4, 5] as const) expect(missingForStep(app, step)).toEqual([]);
    expect(firstIncompleteStepBefore(app, 6)).toBeNull();
    expect(incompleteStepsForSubmit(app)).toEqual([]);
  });

  it("Step 1 requires the five matching answers, and monthly revenue in Canada", () => {
    const errors = step1FieldErrors({}, "CA");
    expect(errors.lookingFor && errors.businessLocation && errors.purposeOfFunds && errors.industry && errors.monthlyRevenue).toBe(true);
    expect(step1FieldErrors({ ...completeApplication().kyc, monthlyRevenue: "Under $10,000" }, "CA").monthlyRevenue).toBe(true);
    expect(step1FieldErrors({ ...completeApplication().kyc, monthlyRevenue: "" }, "US").monthlyRevenue).toBe(false);
  });

  it("Step 3 is skipped on the SBA path and trims media fields", () => {
    expect(missingForStep(completeApplication({ productCategory: "SBA", business: {} }), 3)).toEqual([]);
    const media = completeApplication({ productCategory: "MEDIA" });
    expect(missingForStep({ ...media, business: { ...media.business, employees: "", estimatedRevenue: "" } }, 3)).toEqual([]);
  });

  it("Step 4 requires SIN/SSN, date of birth, home address and an ownership split of 100", () => {
    const app = completeApplication();
    expect(missingForStep({ ...app, applicant: { ...app.applicant, ssn: "", dob: "", street: "" } }, 4)).toEqual([
      "street address",
      "date of birth",
      "SIN / SSN",
    ]);
    const split = { ...app, applicant: { ...app.applicant, ownership: "60", partner: { ...app.applicant, ownership: "30" } } };
    expect(missingForStep(split, 4)).toContain("ownership adding up to 100% across every owner");
    const partnerMissing = { ...app, applicant: { ...app.applicant, ownership: "60", partner: { ownership: "40" } } };
    expect(missingForStep(partnerMissing, 4)).toContain("partner SIN / SSN");
  });

  it("Step 5 needs the required documents or a deferral", () => {
    const app = completeApplication({
      documentsDeferred: false,
      productRequirements: { aggregated: [{ id: "1", document_type: "bank_statements", required: true, stage: 1 }] },
    });
    expect(missingForStep(app, 5)).toHaveLength(1);
    expect(missingForStep({ ...app, documentsDeferred: true }, 5)).toEqual([]);
  });

  it("names the first incomplete step for a deep link and for submit", () => {
    const app = completeApplication({ business: {} });
    expect(firstIncompleteStepBefore(app, 6)).toBe(3);
    expect(firstIncompleteStepBefore(app, 3)).toBeNull();
    const [issue] = incompleteStepsForSubmit(app);
    expect(issue.step).toBe(3);
    expect(describeIncompleteStep(issue)).toMatch(/^Step 3 \(Business Details\) is incomplete: please add business name, business structure, business address, city, and \d+ more\.$/);
  });
});
