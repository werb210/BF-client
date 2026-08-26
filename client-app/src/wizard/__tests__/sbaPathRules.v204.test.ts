// BF_CLIENT_SBA_PATH_RULES_v204
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { isStartupAvailable, computeAllowedCategories } from "../eligibilityRules";

const sba = { category: "SBA", country: "US", active: true } as any;
const startupCa = { category: "STARTUP", country: "CA", active: true } as any;

describe("isStartupAvailable", () => {
  it("a US SBA product unlocks the SBA / Start-up option", () => {
    expect(isStartupAvailable([sba], "US")).toBe(true);
    expect(isStartupAvailable([{ ...sba, category: "SBA_GOVERNMENT" }], "US")).toBe(true);
  });
  it("an SBA product never unlocks the option in Canada", () => {
    expect(isStartupAvailable([{ ...sba, country: "CA" }], "CA")).toBe(false);
  });
  it("a Canadian STARTUP product unlocks it in Canada", () => {
    expect(isStartupAvailable([startupCa], "CA")).toBe(true);
  });
  it("an inactive product does not unlock it", () => {
    expect(isStartupAvailable([{ ...sba, active: false }], "US")).toBe(false);
  });
});

describe("retained answers on the SBA / Start-up path", () => {
  const base = { lookingFor: "capital", location: "US", purpose: "startup", years: "0" } as any;
  it("SBA survives a retained fixed-assets answer of none", () => {
    expect(computeAllowedCategories({ ...base, fixedAssets: "none" })).toContain("SBA");
  });
  it("SBA survives a retained A/R answer", () => {
    expect(computeAllowedCategories({ ...base, ar: ">3m" })).toContain("SBA");
  });
  it("SBA survives both together", () => {
    expect(computeAllowedCategories({ ...base, ar: ">3m", fixedAssets: "none" })).toContain("SBA");
  });
  it("off the startup path the fixed-asset rule still applies", () => {
    const trading = { lookingFor: "capital", location: "US", purpose: "working_capital", years: ">3", fixedAssets: "none" } as any;
    expect(computeAllowedCategories(trading)).not.toContain("SBA");
  });
});

describe("source wiring", () => {
  const step1 = readFileSync(resolve(__dirname, "..", "Step1_KYC.tsx"), "utf-8");
  const step4 = readFileSync(resolve(__dirname, "..", "Step4_Applicant.tsx"), "utf-8");
  it("Step 1 calls the shared helper instead of an inline copy", () => {
    expect(step1).toContain("isStartupAvailable(lenderProducts as any, country)");
    expect(step1).not.toContain('if (cat !== "STARTUP" && cat !== "STARTUP_CAPITAL") return false;');
  });
  it("Step 4 requires an email from every 20%+ additional shareholder on the SBA path", () => {
    expect(step4).toContain("Additional Shareholders needs a valid email address");
    expect(step4).toContain("if (pct > 0 && pct < 20) continue;");
  });
  it("Step 4 only enforces it on the SBA path", () => {
    const i = step4.indexOf("Additional Shareholders needs a valid email address");
    expect(step4.slice(0, i)).toContain("if (onSba) {");
  });
});
