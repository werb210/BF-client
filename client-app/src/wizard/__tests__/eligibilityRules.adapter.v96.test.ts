// BF_CLIENT_BLOCK_v96_LIVE_TEST_FIXES_v1
import { describe, expect, it } from "vitest";
import {
  computeAllowedCategories,
  mapKycToAnswers,
  bucketIdToCat,
} from "../eligibilityRules";

describe("v96 mapKycToAnswers — translates display strings to enum keys", () => {
  it("maps the live-test failing case (Capital + Canada + Buy Inventory + ...)", () => {
    const kyc = {
      lookingFor: "WORKING_CAPITAL",
      fundingAmount: "250000",
      businessLocation: "Canada",
      industry: "Logistics & Trucking",
      purposeOfFunds: "Buy Inventory",
      salesHistory: "Over 3 Years",
      revenueLast12Months: "Over $3,000,000",
      monthlyRevenue: "Over $250,000",
      accountsReceivable: "Over $3,000,000",
      fixedAssets: "Over $500,000",
    };
    const answers = mapKycToAnswers(kyc);
    expect(answers.lookingFor).toBe("capital");
    expect(answers.location).toBe("CA");
    expect(answers.purpose).toBe("inventory");
    expect(answers.years).toBe(">3");
    expect(answers.avgMonthly).toBe(">250k");
    const allowed = computeAllowedCategories(answers).sort();
    // Capital -> all − EQUIPMENT
    // Canada -> -SBA
    // Inventory -> {LOC, PO, MCA}
    // Intersection: {LOC, PO, MCA}
    expect(allowed).toEqual(["LOC", "MCA", "PO"]);
  });

  it("Equipment Financing path narrows to EQUIPMENT only", () => {
    const kyc = {
      lookingFor: "EQUIPMENT", equipmentAmount: "150000",
      businessLocation: "United States", industry: "Construction",
      purposeOfFunds: "Working Capital", salesHistory: "Over 3 Years",
      revenueLast12Months: "Over $3,000,000", monthlyRevenue: "Over $250,000",
      accountsReceivable: "Over $3,000,000", fixedAssets: "Over $500,000",
    };
    expect(computeAllowedCategories(mapKycToAnswers(kyc))).toEqual(["EQUIPMENT"]);
  });
});

describe("v96 bucketIdToCat", () => {
  it("maps server bucket ids to rules-engine Cat keys", () => {
    expect(bucketIdToCat("LINE_OF_CREDIT")).toBe("LOC");
    expect(bucketIdToCat("EQUIPMENT_FINANCE")).toBe("EQUIPMENT");
    expect(bucketIdToCat("PURCHASE_ORDER_FINANCE")).toBe("PO");
    expect(bucketIdToCat("MERCHANT_CASH_ADVANCE")).toBe("MCA");
    expect(bucketIdToCat("ASSET_BASED_LENDING")).toBe("ABL");
    expect(bucketIdToCat("SBA_GOVERNMENT")).toBe("SBA");
    expect(bucketIdToCat("STARTUP_CAPITAL")).toBe("STARTUP");
    expect(bucketIdToCat("UNKNOWN")).toBe(null);
  });
});
