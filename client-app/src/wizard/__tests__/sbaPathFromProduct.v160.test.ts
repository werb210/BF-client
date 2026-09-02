// BF_CLIENT_SBA_PATH_FROM_PRODUCT_v160
// Andrew's file reached SBA by selecting the SBA product rather than by picking
// "SBA / Start-up" as the purpose of funds, so the client did not treat it as
// SBA at all and Step 5 rendered.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isSbaWizardPath, isStartupPathKyc } from "../wizardSchema";

const read = (f: string) => readFileSync(resolve(__dirname, "..", f), "utf-8");

describe("the product decides the path", () => {
  it.each([
    ["productCategory", { productCategory: "SBA" }],
    ["SBA / Government category", { productCategory: "SBA / Government" }],
    ["SBA_GOVERNMENT type", { selectedProductType: "SBA_GOVERNMENT" }],
    ["selectedProduct.category", { selectedProduct: { category: "SBA" } }],
    ["selectedProduct.name", { selectedProduct: { name: "SBA 7(a) Loan" } }],
  ])("%s puts the file on the SBA path", (_label, app) => {
    expect(isSbaWizardPath(app)).toBe(true);
  });

  it("does not need the purpose text - that was the bug", () => {
    expect(isSbaWizardPath({ productCategory: "SBA", kyc: { purposeOfFunds: "Working Capital" } })).toBe(true);
    expect(isStartupPathKyc({ purposeOfFunds: "Working Capital" })).toBe(false);
  });
});

describe("nothing that worked before stops working", () => {
  it("the purpose text still counts when no product is chosen yet", () => {
    expect(isSbaWizardPath({ kyc: { purposeOfFunds: "SBA / Start-up" } })).toBe(true);
    expect(isSbaWizardPath({ kyc: { purposeOfFunds: "Start up Funding" } })).toBe(true);
    expect(isSbaWizardPath({ kyc: { salesHistory: "Zero" } })).toBe(true);
  });

  it("a non-SBA file stays off the path", () => {
    expect(isSbaWizardPath({ productCategory: "LINE OF CREDIT", kyc: { purposeOfFunds: "Working Capital" } })).toBe(false);
    expect(isSbaWizardPath({})).toBe(false);
    expect(isSbaWizardPath(undefined)).toBe(false);
  });
});

describe("every step after product selection uses it", () => {
  it.each([
    ["Step3_Business.tsx", "onSbaStartupPath"],
    ["Step4_Applicant.tsx", "onSba"],
    ["Step5_Documents.tsx", "onSbaPath"],
    ["Step6_Review.tsx", "backTarget"],
  ])("%s", (file) => {
    expect(read(file)).toContain("isSbaWizardPath(app as Record<string, unknown>)");
  });

  it("Step 5 still refuses to render on that path", () => {
    const s = read("Step5_Documents.tsx");
    expect(s).toContain("if (onSbaPath) return null;");
    expect(s).toContain('navigate("/apply/step-6", { replace: true })');
  });
});

describe("Step 1 keeps the old predicate on purpose", () => {
  it("runs before a product exists, so the purpose text is all there is", () => {
    expect(read("Step1_KYC.tsx")).toContain("isStartupPathKyc");
    expect(read("wizardSchema.ts")).toContain("conditional: ({ kyc }) => !isStartupPathKyc(kyc)");
  });
});
