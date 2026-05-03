// BF_CLIENT_BLOCK_v94_ZOD_DUAL_AMOUNT_HOTFIX_v1
import { describe, expect, it } from "vitest";
import { toStep1SchemaInput, step1Schema } from "../v1WizardSchema";

const baseKyc = {
  lookingFor: "WORKING_CAPITAL",
  businessLocation: "United States",
  industry: "Retail",
  purposeOfFunds: "Working Capital",
  salesHistory: "Over 3 Years",
  revenueLast12Months: "$500,001 to $1,000,000",
  monthlyRevenue: "$50,000 to $100,000",
  accountsReceivable: "$100,000 to $250,000",
  fixedAssets: "Over $500,000",
};

describe("v94 dual-amount Zod hotfix", () => {
  it("Capital path passes with fundingAmount populated", () => {
    const out = toStep1SchemaInput({ ...baseKyc, lookingFor: "WORKING_CAPITAL", fundingAmount: "250000" });
    expect(out.requestedAmount).toBe(250_000);
    expect(step1Schema.safeParse(out).success).toBe(true);
  });
  it("Pure-Equipment path passes with equipmentAmount populated", () => {
    const out = toStep1SchemaInput({ ...baseKyc, lookingFor: "EQUIPMENT", equipmentAmount: "180000" });
    expect(out.requestedAmount).toBe(180_000);
    expect(step1Schema.safeParse(out).success).toBe(true);
  });
  it("Capital&Equipment path passes with fundingAmount (capital leg) populated", () => {
    const out = toStep1SchemaInput({
      ...baseKyc, lookingFor: "BOTH",
      fundingAmount: "300000", equipmentAmount: "120000",
    });
    expect(out.requestedAmount).toBe(300_000);
    expect(step1Schema.safeParse(out).success).toBe(true);
  });
  it("Empty all amount fields fails .positive()", () => {
    const out = toStep1SchemaInput({ ...baseKyc, fundingAmount: "", equipmentAmount: "", capitalAmount: "" });
    expect(out.requestedAmount).toBe(0);
    expect(step1Schema.safeParse(out).success).toBe(false);
  });
});
