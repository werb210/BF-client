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

// BF_CLIENT_CLOSING_COST_LOC_OVER_50K_v1 - companion is 15% of the parent
// equipment total, capped $250k; under $50k TERM, $50k and over LOC.
describe("closing-cost companion routing", () => {
  it("$200k equipment -> $30k TERM", () => {
    const c = computeCompanion(200_000);
    expect(c.amount).toBe(30_000);
    expect(c.category).toBe("TERM");
    expect(c.matchCategories).toEqual(["TERM"]);
  });
  it("$300k equipment -> $45k TERM (still under $50k)", () => {
    const c = computeCompanion(300_000);
    expect(c.amount).toBe(45_000);
    expect(c.matchCategories).toEqual(["TERM"]);
  });
  it("$400k equipment -> $60k LOC", () => {
    const c = computeCompanion(400_000);
    expect(c.amount).toBe(60_000);
    expect(c.category).toBe("LOC");
    expect(c.matchCategories).toEqual(["LOC"]);
  });
  it("caps at $250k", () => {
    expect(computeCompanion(5_000_000).amount).toBe(250_000);
  });
  it("never returns both categories", () => {
    for (const eq of [10_000, 200_000, 333_333, 400_000, 5_000_000]) {
      expect(computeCompanion(eq).matchCategories).toHaveLength(1);
    }
  });
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
