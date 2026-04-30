// BF_CLIENT_v66_anchors
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const W = (name: string) =>
  readFileSync(join(__dirname, "..", name), "utf8");

describe("anchors", () => {
  it("contains v66 anchors", () => {
    expect(W("Step5_Documents.tsx")).toContain("BF_CLIENT_v66_STATUS_NO_LOOP");
    expect(W("Step6_Review.tsx")).toContain("BF_CLIENT_v66_SUBMIT_PHONE_FALLBACK");
    expect(W("Step1_KYC.tsx")).toContain("BF_CLIENT_v66_STEP1_INDUSTRIES");
    expect(W("Step3_Business.tsx")).toContain("BF_CLIENT_v66_STEP3_LEGAL_OPTIONAL");
    expect(W("Step4_Applicant.tsx")).toContain("BF_CLIENT_v66_STEP4_NO_PHONE_PREFILL");
    expect(W("Step4_Applicant.tsx")).toContain("BF_CLIENT_v66_STEP4_CAPITALIZE");
  });
});
