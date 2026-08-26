// BF_CLIENT_SBA_PATH_RULES_v203
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
  // The exact shape of a pre-revenue US start-up that answered the balance
  // sheet questions before switching purpose.
  const base = {
    lookingFor: "capital",
    location: "US",
    purpose: "startup",
    years: "0",
  } as any;

  it("SBA survives a retained fixed-assets answer of none", () => {
    expect(computeAllowedCategories({ ...base, fixedAssets: "none" })).toContain("SBA");
  });

  it("SBA survives a retained A/R answer", () => {
    expect(computeAllowedCategories({ ...base, ar: ">3m" })).toContain("SBA");
  });

  it("SBA survives both together", () => {
    expect(
      computeAllowedCategories({ ...base, ar: ">3m", fixedAssets: "none" }),
    ).toContain("SBA");
  });

  it("off the startup path the fixed-asset rule still applies", () => {
    const trading = {
      lookingFor: "capital", location: "US", purpose: "working_capital",
      years: ">3", fixedAssets: "none",
    } as any;
    expect(computeAllowedCategories(trading)).not.toContain("SBA");
  });
});

describe("Step1_KYC wiring", () => {
  it("calls the shared helper instead of an inline copy", () => {
    const src = readFileSync(resolve(__dirname, "..", "Step1_KYC.tsx"), "utf-8");
    expect(src).toContain("isStartupAvailable(lenderProducts as any, country)");
    expect(src).not.toContain('if (cat !== "STARTUP" && cat !== "STARTUP_CAPITAL") return false;');
  });
});
