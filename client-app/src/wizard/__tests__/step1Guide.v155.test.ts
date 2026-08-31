// BF_CLIENT_STEP1_GUIDE_v155
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const step1 = readFileSync(resolve(__dirname, "..", "Step1_KYC.tsx"), "utf-8");

describe("the error messages can now actually appear", () => {
  it("Continue is no longer disabled, so its click handler runs", () => {
    // disabled suppressed the click, and the click was the only thing that set
    // showErrors - so every per-field message was unreachable.
    const i = step1.indexOf('console.log("[wizard] Continue clicked"');
    const button = step1.slice(i, i + 1400);
    expect(button).not.toMatch(/(?<!aria-)disabled=\{!isValid\}/);
    expect(button).toContain("aria-disabled={!isValid}");
  });

  it("still refuses to advance", () => {
    expect(step1).toContain("if (!isValid) {");
    expect(step1).toContain('console.warn("[wizard] Continue blocked by isValid=false")');
  });

  it("still reveals the per-field messages", () => {
    expect(step1).toContain("setShowErrors(true);");
    expect(step1).toContain("showErrors && fieldErrors.lookingFor");
  });
});

describe("the summary names what is missing", () => {
  it("renders only once they have tried", () => {
    expect(step1).toContain("{showErrors && !isValid && (");
  });

  it("is derived from the same object that gates Continue", () => {
    expect(step1).toContain("Object.entries(fieldErrors)");
    expect(step1).toContain(".filter(([, bad]) => bad)");
  });

  it("uses plain language, not field keys", () => {
    expect(step1).toContain('lookingFor: "what you are looking for"');
    expect(step1).toContain('monthlyRevenue: "your average monthly revenue"');
  });

  it("falls back to the key rather than rendering undefined", () => {
    expect(step1).toContain("STEP1_FIELD_LABELS[key] ?? key");
  });

  it("counts correctly for one versus many", () => {
    expect(step1).toContain('"One thing left:"');
    expect(step1).toContain("things left:");
  });

  it("is announced to screen readers", () => {
    expect(step1).toContain('role="alert"');
  });
});

describe("a refusal is not described as a missing answer", () => {
  it("says we cannot match it, rather than asking again for a field they filled", () => {
    expect(step1).toContain("blockedByRevenueFloor");
    expect(step1).toContain("We cannot match this one.");
  });

  it("gives them a way to reach a person", () => {
    expect(step1).toContain("(825) 451-1768");
  });
});
