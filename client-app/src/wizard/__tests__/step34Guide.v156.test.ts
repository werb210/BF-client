// BF_CLIENT_STEP34_GUIDE_v156
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const step3 = readFileSync(resolve(__dirname, "..", "Step3_Business.tsx"), "utf-8");
const step4 = readFileSync(resolve(__dirname, "..", "Step4_Applicant.tsx"), "utf-8");

const continueOf = (src: string, marker: string) => {
  const i = src.indexOf(marker);
  return src.slice(i, i + 1400);
};

describe.each([
  ["Step 3", step3, "BF_CLIENT_STEP34_GUIDE_v156 - not disabled"],
  ["Step 4", step4, "BF_CLIENT_STEP34_GUIDE_v156 - see Step 3."],
])("%s", (_name, src, marker) => {
  it("Continue is not disabled, so the click that explains can happen", () => {
    const btn = continueOf(src, marker);
    expect(btn).not.toMatch(/(?<!aria-)disabled=\{!isValid\}/);
    expect(btn).toContain("aria-disabled={!isValid}");
  });

  it("still refuses to advance", () => {
    expect(continueOf(src, marker)).toContain("if (!isValid) {");
  });

  it("names what is missing instead of doing nothing", () => {
    const btn = continueOf(src, marker);
    expect(btn).toContain("One thing left:");
    expect(btn).toContain("things left:");
    expect(btn).toContain("setSaveError(");
  });

  it("clears the message once it passes", () => {
    expect(continueOf(src, marker)).toContain("setSaveError(null);");
  });

  it("renders through the error block the step already had", () => {
    expect(src).toContain("{saveError && (");
  });
});

describe("Step 3 reuses the labels it already built", () => {
  it("does not re-derive the list", () => {
    expect(step3).toContain("missingStep3.join(\", \")");
    expect(step3).toContain('["zip", "postal or ZIP code"]');
  });
});

describe("Step 4 explains an ownership split, not a blank box", () => {
  it("distinguishes a total that does not reach 100 from a missing field", () => {
    expect(step4).toContain("ownership adding up to 100% across every owner");
    expect(step4).toContain("ownershipRangeValid && !ownershipTotalValid");
  });

  it("names partner fields as partner fields", () => {
    expect(step4).toContain('out.push(`partner ${STEP4_LABELS[f] ?? f}`)');
  });

  it("only asks for partner fields when there is a partner", () => {
    expect(step4).toContain("if (hasPartner) {");
  });

  it("uses the regional identity label rather than hardcoding SSN", () => {
    expect(step4).toContain("ssn: identityLabel.toLowerCase()");
  });
});
