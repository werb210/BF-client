import { describe, expect, it } from "vitest";
import { toStep1SchemaInput, enforceV1StepSchema } from "../v1WizardSchema";

const baseKyc = {
  lookingFor: "Capital",
  fundingAmount: "$1,200,000",
  businessLocation: "Canada",
  industry: "Manufacturing",
  purposeOfFunds: "Working Capital",
  monthlyRevenue: "Over $250,000",
};

describe("toStep1SchemaInput dual-bound keys (Block 15)", () => {
  it("uses fixedAssets when set", () => {
    const out = toStep1SchemaInput({ ...baseKyc, fixedAssets: "Over $500,000" });
    expect(out.fixedAssetsValueRange).toBe("Over $500,000");
  });
  it("falls back to availableCollateral when fixedAssets is empty", () => {
    const out = toStep1SchemaInput({ ...baseKyc, availableCollateral: "Over $500,000", fixedAssets: "" });
    expect(out.fixedAssetsValueRange).toBe("Over $500,000");
  });
  it("falls back to arBalance when accountsReceivable is empty", () => {
    const out = toStep1SchemaInput({ ...baseKyc, arBalance: "$500,000 to $1,000,000", accountsReceivable: "" });
    expect(out.accountsReceivableRange).toBe("$500,000 to $1,000,000");
  });
  it("falls back to yearsInBusiness when salesHistory is empty", () => {
    const out = toStep1SchemaInput({ ...baseKyc, yearsInBusiness: "Over 3 Years", salesHistory: "" });
    expect(out.salesHistoryYears).toBe("Over 3 Years");
  });
});

describe("enforceV1StepSchema step1 with dual-bound keys (Block 15)", () => {
  it("passes when only the legacy keys are populated", () => {
    const fullKyc = {
      ...baseKyc,
      salesHistory: "",
      yearsInBusiness: "Over 3 Years",
      revenueLast12Months: "",
      annualRevenue: "Over $3,000,000",
      accountsReceivable: "",
      arBalance: "$500,000 to $1,000,000",
      fixedAssets: "",
      availableCollateral: "Over $500,000",
    };
    expect(() => enforceV1StepSchema("step1", fullKyc)).not.toThrow();
  });
  it("passes when only the canonical keys are populated", () => {
    const fullKyc = {
      ...baseKyc,
      salesHistory: "Over 3 Years",
      revenueLast12Months: "Over $3,000,000",
      accountsReceivable: "$500,000 to $1,000,000",
      fixedAssets: "Over $500,000",
    };
    expect(() => enforceV1StepSchema("step1", fullKyc)).not.toThrow();
  });
});
