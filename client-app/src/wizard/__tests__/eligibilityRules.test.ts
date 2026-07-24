// BF_CLIENT_BLOCK_v92_FULL_WIZARD_FINALIZE_v1
import { describe, expect, it } from "vitest";
import { computeAllowedCategories, detectHardStop, computeCompanion, buildLegs, type Step1Answers } from "../eligibilityRules";

describe("v92 hard stops", () => {
  it("OTHER location blocks", () => {
    expect(detectHardStop({ location: "OTHER" })?.reason).toBe("OTHER_LOCATION");
    expect(computeAllowedCategories({ location: "OTHER" })).toEqual([]);
  });
  it("<10k blocks", () => {
    expect(detectHardStop({ avgMonthly: "<10k" })?.reason).toBe("MIN_REVENUE");
    expect(computeAllowedCategories({ avgMonthly: "<10k" })).toEqual([]);
  });
  it("does not hard-stop startup applicants on revenue", () => {
    expect(detectHardStop({ purpose: "startup", avgMonthly: "<10k" })).toBeNull();
    expect(computeAllowedCategories({ years: "0", avgMonthly: "<10k" })).not.toEqual([]);
  });
});

describe("v92 lookingFor", () => {
  it("equipment narrows to EQUIPMENT only", () => {
    expect(computeAllowedCategories({ lookingFor: "equipment" })).toEqual(["EQUIPMENT"]);
  });
  it("capital_and_equipment excludes EQUIPMENT from Step 2 set", () => {
    expect(computeAllowedCategories({ lookingFor: "capital_and_equipment" })).not.toContain("EQUIPMENT");
  });
});

describe("v92 country", () => {
  it("Canada drops SBA", () => {
    const a: Step1Answers = { location: "CA" };
    expect(computeAllowedCategories(a)).not.toContain("SBA");
  });
  it("US keeps SBA", () => {
    expect(computeAllowedCategories({ location: "US" })).toContain("SBA");
  });
});

// BF_CLIENT_TEST_REPAIR_v1 - computeCompanion() now also returns
// matchCategories. toEqual is exact-match, so the added field failed three
// tests even though amount and category were correct. Assert the contract
// these tests exist to pin, not the whole object shape.
describe("v92 companion routing", () => {
  it("$200k -> $40k TERM", () => { expect(computeCompanion(200_000)).toMatchObject({ amount: 40_000, category: "TERM" }); });
  // $300k * 0.2 = $60k, which lands in the $50,001-$250k band that
  // BF_CLIENT_CLOSING_COST_DUAL_v1 defines as matching BOTH TERM and LOC, with
  // TERM primary. This test predates that locked rule and asserted LOC only.
  it("$300k -> $60k matches both TERM and LOC, TERM primary", () => {
    const c = computeCompanion(300_000);
    expect(c.amount).toBe(60_000);
    expect(c.category).toBe("TERM");
    expect(c.matchCategories).toEqual(["TERM", "LOC"]);
  });
  it("$1.5m -> $300k is LOC only", () => {
    const c = computeCompanion(1_500_000);
    expect(c.amount).toBe(300_000);
    expect(c.matchCategories).toEqual(["LOC"]);
  });
  it("$250k -> $50k TERM (boundary <=)", () => { expect(computeCompanion(250_000)).toMatchObject({ amount: 50_000, category: "TERM" }); });
});

describe("v92 buildLegs", () => {
  it("equipment + closing costs → 2 legs", () => {
    const legs = buildLegs({
      lookingFor: "equipment", selectedCapitalCategory: undefined,
      capitalAmount: 0, equipmentAmount: 200_000, fundingAmount: 0,
      closingCostsChecked: true,
    });
    expect(legs).toHaveLength(2);
    expect(legs[1]?.isCompanion).toBe(true);
    expect(legs[1]?.category).toBe("TERM");
  });
  it("capital_and_equipment → 2 legs", () => {
    const legs = buildLegs({
      lookingFor: "capital_and_equipment", selectedCapitalCategory: "FACTORING",
      capitalAmount: 100_000, equipmentAmount: 80_000, fundingAmount: 0,
      closingCostsChecked: false,
    });
    expect(legs.map((l) => l.category)).toEqual(["FACTORING", "EQUIPMENT"]);
  });
});
