// BF_CLIENT_SBA_WIZARD_FLOW_v210
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const R = (f: string) => readFileSync(resolve(__dirname, "..", f), "utf-8");
const step2 = R("Step2_Product.tsx");
const step3 = R("Step3_Business.tsx");
const step4 = R("Step4_Applicant.tsx");

describe("Step 2 auto-advance", () => {
  it("only fires on the SBA path", () => {
    expect(step2).toContain("isStartupPathKyc((app?.kyc ?? {}) as Record<string, unknown>)");
  });

  it("refuses to choose when there is a real choice", () => {
    expect(step2).toContain("if (buckets.length !== 1) return;");
  });

  it("waits for the selection to land before advancing", () => {
    expect(step2).toContain('if (sbaAutoRef.current !== "selecting") return;');
    expect(step2).toContain("if (!selectedBucket) return;");
  });

  it("cannot loop", () => {
    expect(step2).toContain('sbaAutoRef.current = "advancing"');
    expect(step2).toContain('if (sbaAutoRef.current !== "idle") return;');
  });

  it("does not render the chooser while advancing", () => {
    expect(step2).toContain('sbaAutoRef.current === "idle" && visibleCategoryBuckets.map');
  });

  it("uses the real symbols, not invented ones", () => {
    expect(step2).toContain("visibleCategoryBuckets");
    expect(step2).toContain("selectCategory(only.bucket");
    expect(step2).toContain("import { useEffect, useMemo, useRef, useState }");
  });
});

describe("Step 3 layout", () => {
  it("the SBA questions are no longer forced full width", () => {
    const start = step3.indexOf("SBA LOAN QUESTIONS");
    const end = step3.indexOf("Business Name (DBA)", start);
    const block = step3.slice(start, end);
    expect(block).not.toContain('gridColumn: "1 / -1"');
  });
});

describe("Step 4 button", () => {
  it("does not promise Documents on a path that skips it", () => {
    expect(step4).toContain('{onSba ? "Continue to Review');
  });

  it("still says Documents off the SBA path", () => {
    expect(step4).toContain('"Continue to Documents');
  });

  it("Step 5 was already skipped for SBA - unchanged", () => {
    expect(step4).toContain('navigate("/apply/step-6")');
  });
});
