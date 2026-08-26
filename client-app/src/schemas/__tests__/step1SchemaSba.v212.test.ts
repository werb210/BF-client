// BF_CLIENT_STEP1_SCHEMA_SBA_v212
import { describe, it, expect } from "vitest";
import { step1Schema } from "../v1WizardSchema";

// Exactly what Step 1 produces on the SBA path: the four hidden questions are
// empty because the inputs are not rendered.
const sbaApplicant = {
  fundingType: "WORKING_CAPITAL",
  requestedAmount: 100000,
  businessLocation: "United States",
  purposeOfFunds: "SBA / Start-up",
  industry: "",
  salesHistoryYears: "",
  annualRevenueRange: "",
  avgMonthlyRevenueRange: "",
  accountsReceivableRange: "",
  fixedAssetsValueRange: "",
};

describe("SBA path", () => {
  it("passes with every hidden field empty", () => {
    expect(step1Schema.safeParse(sbaApplicant).success).toBe(true);
  });

  it("recognises the CURRENT option label", () => {
    // v190 renamed this. Matching the old label is what broke it.
    expect(step1Schema.safeParse({ ...sbaApplicant, purposeOfFunds: "SBA / Start-up" }).success).toBe(true);
  });

  it("still recognises the legacy label, for saved drafts", () => {
    expect(step1Schema.safeParse({ ...sbaApplicant, purposeOfFunds: "Start up Funding" }).success).toBe(true);
  });

  it("zero sales history exempts regardless of purpose", () => {
    const zero = { ...sbaApplicant, purposeOfFunds: "Working Capital", salesHistoryYears: "Zero" };
    expect(step1Schema.safeParse(zero).success).toBe(true);
  });
});

describe("normal path is unchanged", () => {
  const trading = {
    fundingType: "WORKING_CAPITAL",
    requestedAmount: 250000,
    businessLocation: "Canada",
    purposeOfFunds: "Working Capital",
    industry: "Real Estate",
    salesHistoryYears: "Over 3 Years",
    annualRevenueRange: "$1,000,001 to $3,000,000",
    avgMonthlyRevenueRange: "$50,000 to $100,000",
    accountsReceivableRange: "$500,000 to $1,000,000",
    fixedAssetsValueRange: "Over $500,000",
  };

  it("passes when everything is answered", () => {
    expect(step1Schema.safeParse(trading).success).toBe(true);
  });

  it.each([
    "industry",
    "salesHistoryYears",
    "annualRevenueRange",
    "avgMonthlyRevenueRange",
    "accountsReceivableRange",
    "fixedAssetsValueRange",
  ])("still requires %s off the startup path", (field) => {
    const r = step1Schema.safeParse({ ...trading, [field]: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === field)).toBe(true);
    }
  });

  it("still requires the unconditional fields on both paths", () => {
    expect(step1Schema.safeParse({ ...sbaApplicant, businessLocation: "" }).success).toBe(false);
    expect(step1Schema.safeParse({ ...sbaApplicant, requestedAmount: 0 }).success).toBe(false);
  });
});
