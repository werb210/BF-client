// BF_CLIENT_SBA_STEP1_WIRE_v201
// Pins the rule Step 1 must follow. The regression this replaces was not a
// wrong rule but a second copy of it: eligibilityRules had the right logic and
// nothing imported it. These assert the exported function directly, and the
// source assertion at the bottom pins that Step 1 actually calls it.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { isStartupAvailable } from "../eligibilityRules";

const sba = { category: "SBA", country: "US", active: true } as any;
const sbaLong = { category: "SBA_GOVERNMENT", country: "US", active: true } as any;
const startupCa = { category: "STARTUP", country: "CA", active: true } as any;

describe("isStartupAvailable", () => {
  it("a US SBA product unlocks the SBA / Start-up option", () => {
    expect(isStartupAvailable([sba], "US")).toBe(true);
    expect(isStartupAvailable([sbaLong], "US")).toBe(true);
  });

  it("an SBA product never unlocks the option in Canada", () => {
    expect(isStartupAvailable([{ ...sba, country: "CA" }], "CA")).toBe(false);
  });

  it("a Canadian STARTUP product unlocks it in Canada", () => {
    expect(isStartupAvailable([startupCa], "CA")).toBe(true);
  });

  it("an inactive SBA product does not unlock it", () => {
    expect(isStartupAvailable([{ ...sba, active: false }], "US")).toBe(false);
  });

  it("no country means no option", () => {
    expect(isStartupAvailable([sba], "")).toBe(false);
  });
});

describe("Step1_KYC wiring", () => {
  it("calls the shared helper instead of an inline copy", () => {
    const src = readFileSync(
      resolve(__dirname, "..", "Step1_KYC.tsx"),
      "utf-8",
    );
    expect(src).toContain("isStartupAvailable(lenderProducts as any, country)");
    // The inline copy's distinguishing line must be gone.
    expect(src).not.toContain('if (cat !== "STARTUP" && cat !== "STARTUP_CAPITAL") return false;');
  });
});
