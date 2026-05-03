// BF_CLIENT_BLOCK_v99_STEP2_SELECT_AND_RULES_v1
import { describe, expect, it } from "vitest";
import { computeAllowedCategories } from "../eligibilityRules";

describe("v99 rules engine — MEDIA gating", () => {
  const baseAnswers = {
    lookingFor: "capital" as const,
    fundingAmount: 250000,
    location: "CA" as const,
    industry: "Construction",
    years: ">3" as const,
    revenue12: "150-500k" as const,
    avgMonthly: "25-50k" as const,
    ar: "100-250k" as const,
    fixedAssets: "50-100k" as const,
  };

  it("hides MEDIA when purpose is working_capital", () => {
    const allowed = computeAllowedCategories({ ...baseAnswers, purpose: "working_capital" });
    expect(allowed).not.toContain("MEDIA");
  });
  it("hides MEDIA when purpose is expansion", () => {
    const allowed = computeAllowedCategories({ ...baseAnswers, purpose: "expansion" });
    expect(allowed).not.toContain("MEDIA");
  });
  it("shows MEDIA when purpose is media", () => {
    const allowed = computeAllowedCategories({ ...baseAnswers, purpose: "media" });
    expect(allowed).toContain("MEDIA");
  });
  it("Canada + Capital + Expansion + $250k excludes MEDIA before product intersection", () => {
    const allowed = computeAllowedCategories({ ...baseAnswers, purpose: "expansion" });
    expect(new Set(allowed)).toEqual(new Set(["LOC", "TERM", "FACTORING", "PO", "MCA", "ABL"]));
  });
});
