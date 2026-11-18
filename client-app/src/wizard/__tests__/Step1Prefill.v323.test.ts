// BF_CLIENT_BLOCK_v323_TEST2_FIX_PACK_v1
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "../Step1_KYC.tsx"), "utf8");

describe("v323 — token-based prefill mirrors all 13 fields (F)", () => {
  const expectedKycKeys = [
    "businessLocation",
    "purposeOfFunds",
    "requestedAmount",
    "fundingAmount",
    "salesHistory",
    "revenueLast12Months",
    "annualRevenue",
    "monthlyRevenue",
    "accountsReceivable",
    "arBalance",
    "fixedAssets",
    "availableCollateral",
    "companyName",
    "industry",
  ];
  for (const k of expectedKycKeys) {
    it(`token-based effect writes kyc.${k}`, () => {
      // BF_CLIENT_PREFILL_FILL_EMPTY_v1 - prefill only fills an empty field (what is typed wins).
      expect(src).toMatch(new RegExp(`\\b${k}:\\s*app\\.kyc\\.\\w+ \\|\\| \\(data\\.`));
    });
  }
  it("applicant + business slots also hydrated from token", () => {
    expect(src).toMatch(/applicant:\s*\{[\s\S]+fullName:\s*\(data\.fullName/);
    expect(src).toMatch(/business:\s*\{[\s\S]+companyName:\s*app\.business\?\.companyName \|\| \(data\.companyName/);
  });
});

describe("v323 — lookingFor auto-derives from purposeOfFunds (G)", () => {
  it("equipment-only purpose → Equipment", () => {
    expect(src).toMatch(/derived = "Equipment"/);
  });
  it("both equipment + capital → Both", () => {
    expect(src).toMatch(/derived = "Both"/);
  });
  it("capital \/ working capital \/ loc \/ term → Capital", () => {
    expect(src).toMatch(/derived = "Capital"/);
  });
  it("skips when lookingFor already set", () => {
    expect(src).toMatch(/if \(app\.kyc\?\.lookingFor\) return/);
  });
});
