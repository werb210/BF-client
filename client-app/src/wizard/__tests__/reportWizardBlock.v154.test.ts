// BF_CLIENT_REPORT_BLOCK_v154
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const step1 = readFileSync(resolve(__dirname, "..", "Step1_KYC.tsx"), "utf-8");
const autosave = readFileSync(resolve(__dirname, "..", "..", "client", "autosave.ts"), "utf-8");

describe("why this is needed at all", () => {
  it("step data is saved to localStorage and nowhere else", () => {
    expect(autosave).toContain("storage.setItem(getDraftKey(step)");
    expect(autosave).not.toContain("fetch(");
  });
});

describe("the block is reported", () => {
  it("fires on the Canadian revenue hard stop", () => {
    expect(step1).toContain('reportWizardBlock("ca_under_10k_monthly_revenue"');
  });

  it("sends the answer that caused it", () => {
    expect(step1).toContain("monthlyRevenue: value");
    expect(step1).toContain("country: countryCode");
  });

  it("survives the tab closing, which is what these users do", () => {
    expect(step1).toContain("keepalive: true");
  });
});

describe("it cannot make things worse for the applicant", () => {
  it("never throws", () => {
    const i = step1.indexOf("function reportWizardBlock");
    const fn = step1.slice(i, i + 1200);
    expect(fn).toContain("try {");
    expect(fn).toContain(".catch(() => {})");
  });

  it("does not await, so the modal is not delayed", () => {
    expect(step1).toContain("void fetch(");
  });
});

describe("it does not inflate the count", () => {
  it("carries a stable session key", () => {
    expect(step1).toContain("blockSessionRef");
    expect(step1).toContain("sessionKey: blockSessionRef.current");
  });
});
