// BF_CLIENT_STEP6_BACK_v151
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const step6 = readFileSync(resolve(__dirname, "..", "Step6_Review.tsx"), "utf-8");
const step5 = readFileSync(resolve(__dirname, "..", "Step5_Documents.tsx"), "utf-8");

describe("Back skips a step that refuses to render", () => {
  it("Step 5 bounces the SBA path straight back to Step 6", () => {
    expect(step5).toContain("if (!onSbaPath) return;");
    expect(step5).toContain('navigate("/apply/step-6", { replace: true })');
  });

  it("so Step 6 goes to Step 4 instead on that path", () => {
    expect(step6).toContain('? "/apply/step-4"');
    expect(step6).toContain(': "/apply/step-5"');
  });

  it("uses the same predicate Step 5 uses, so the two cannot disagree", () => {
    // BF_CLIENT_SBA_PATH_FROM_PRODUCT_v160 - both moved to the product-aware
    // predicate together, which is the point: they must not diverge.
    expect(step6).toContain("isSbaWizardPath");
    expect(step5).toContain("isSbaWizardPath");
  });

  it("no longer hardcodes step-5", () => {
    expect(step6).not.toContain('navigate("/apply/step-5")');
    expect(step6).toContain("navigate(backTarget)");
  });
});
