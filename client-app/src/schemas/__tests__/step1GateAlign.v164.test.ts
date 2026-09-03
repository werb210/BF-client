// BF_CLIENT_STEP1_SCHEMA_GATE_ALIGN_v164
// Reproduces the reported Step 1 ZOD VALIDATION FAILED: a form the Continue gate
// accepts (salesHistory / annualRevenue / accountsReceivable / fixedAssets left
// blank - all optional per v188) must also pass the schema, off the startup path.
import { describe, it, expect } from "vitest";
import { step1Schema, toStep1SchemaInput } from "../v1WizardSchema";

const gatePassingKyc = {
  lookingFor: "Working Capital",
  fundingAmount: "$300,000",
  businessLocation: "Canada",
  purposeOfFunds: "",
  industry: "Construction",
  monthlyRevenue: "$30,001 to $100,000",
  salesHistory: "",
  annualRevenue: "",
  accountsReceivable: "",
  availableCollateral: "",
};

describe("step1 schema matches the Continue gate", () => {
  it("PASSES when the four optional financial fields are blank (was the bug)", () => {
    const res = step1Schema.safeParse(toStep1SchemaInput(gatePassingKyc));
    if (!res.success) {
      throw new Error("unexpected failure: " + res.error.issues.map((i) => i.path.join(".")).join(", "));
    }
    expect(res.success).toBe(true);
  });

  it("still FAILS when industry is missing off the startup path", () => {
    const res = step1Schema.safeParse(toStep1SchemaInput({ ...gatePassingKyc, industry: "" }));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes("industry"))).toBe(true);
    }
  });

  it("still FAILS when monthly revenue is missing off the startup path", () => {
    const res = step1Schema.safeParse(toStep1SchemaInput({ ...gatePassingKyc, monthlyRevenue: "" }));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes("avgMonthlyRevenueRange"))).toBe(true);
    }
  });

  it("does NOT require the four financial fields (they must never appear as issues)", () => {
    const res = step1Schema.safeParse(toStep1SchemaInput(gatePassingKyc));
    const bad = res.success ? [] : res.error.issues.map((i) => i.path.join("."));
    for (const f of ["salesHistoryYears", "annualRevenueRange", "accountsReceivableRange", "fixedAssetsValueRange"]) {
      expect(bad).not.toContain(f);
    }
  });
});
