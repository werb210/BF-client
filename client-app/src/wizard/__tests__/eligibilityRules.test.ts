// BF_CLIENT_BLOCK_v91_ELIGIBILITY_RULES_AND_STEP1_HARDSTOPS_v1
import { describe, expect, it } from "vitest";
import {
  computeAllowedCategories,
  detectHardStop,
  computeCompanion,
  buildLegs,
  type Step1Answers,
} from "../eligibilityRules";

describe("v91 hard stops", () => {
  it("OTHER location blocks", () => {
    expect(detectHardStop({ location: "OTHER" })?.reason).toBe("OTHER_LOCATION");
    expect(computeAllowedCategories({ location: "OTHER" })).toEqual([]);
  });
  it("<10k avg monthly blocks", () => {
    expect(detectHardStop({ avgMonthly: "<10k" })?.reason).toBe("MIN_REVENUE");
    expect(computeAllowedCategories({ avgMonthly: "<10k" })).toEqual([]);
  });
  it("hard stops short-circuit other answers", () => {
    expect(
      computeAllowedCategories({
        location: "OTHER", purpose: "working_capital",
        years: ">3", revenue12: ">3m",
      }),
    ).toEqual([]);
  });
});

describe("v91 lookingFor", () => {
  it("equipment narrows to EQUIPMENT only", () => {
    expect(computeAllowedCategories({ lookingFor: "equipment" })).toEqual(["EQUIPMENT"]);
  });
  it("capital excludes EQUIPMENT", () => {
    expect(computeAllowedCategories({ lookingFor: "capital" })).not.toContain("EQUIPMENT");
  });
  it("capital_and_equipment excludes EQUIPMENT from Step 2 set", () => {
    expect(computeAllowedCategories({ lookingFor: "capital_and_equipment" })).not.toContain("EQUIPMENT");
  });
});

describe("v91 country", () => {
  it("Canada drops SBA", () => {
    const a: Step1Answers = { location: "CA" };
    expect(computeAllowedCategories(a)).not.toContain("SBA");
    expect(computeAllowedCategories(a)).toContain("STARTUP");
  });
  it("US keeps SBA", () => {
    expect(computeAllowedCategories({ location: "US" })).toContain("SBA");
  });
});

describe("v91 purpose", () => {
  it("inventory narrows to LOC, PO, MCA", () => {
    expect(computeAllowedCategories({ purpose: "inventory" }).sort()).toEqual(["LOC","MCA","PO"]);
  });
  it("media narrows to LOC, TERM, MEDIA", () => {
    expect(computeAllowedCategories({ purpose: "media" }).sort()).toEqual(["LOC","MEDIA","TERM"]);
  });
});

describe("v91 closing-costs companion routing", () => {
  it("$200k equipment → $40k TERM", () => {
    expect(computeCompanion(200_000)).toEqual({ amount: 40_000, category: "TERM" });
  });
  it("$300k equipment → $60k LOC", () => {
    expect(computeCompanion(300_000)).toEqual({ amount: 60_000, category: "LOC" });
  });
  it("$50k boundary stays TERM (≤)", () => {
    expect(computeCompanion(250_000)).toEqual({ amount: 50_000, category: "TERM" });
  });
});

describe("v91 buildLegs", () => {
  it("capital → 1 leg", () => {
    const legs = buildLegs({
      lookingFor: "capital", selectedCapitalCategory: "LOC",
      capitalAmount: 0, equipmentAmount: 0, fundingAmount: 250_000,
      closingCostsChecked: false,
    });
    expect(legs).toEqual([{ category: "LOC", amount: 250_000 }]);
  });
  it("equipment + closing costs → 2 legs", () => {
    const legs = buildLegs({
      lookingFor: "equipment", selectedCapitalCategory: undefined,
      capitalAmount: 0, equipmentAmount: 200_000, fundingAmount: 0,
      closingCostsChecked: true,
    });
    expect(legs).toHaveLength(2);
    expect(legs[0]).toEqual({ category: "EQUIPMENT", amount: 200_000 });
    expect(legs[1]?.isCompanion).toBe(true);
    expect(legs[1]?.category).toBe("TERM");
  });
  it("capital_and_equipment → 2 legs (chosen + EQUIPMENT)", () => {
    const legs = buildLegs({
      lookingFor: "capital_and_equipment", selectedCapitalCategory: "FACTORING",
      capitalAmount: 100_000, equipmentAmount: 80_000, fundingAmount: 0,
      closingCostsChecked: false,
    });
    expect(legs.map((l) => l.category)).toEqual(["FACTORING", "EQUIPMENT"]);
  });
});
