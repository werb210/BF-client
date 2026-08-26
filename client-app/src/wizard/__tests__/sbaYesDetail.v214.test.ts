// BF_CLIENT_SBA_YES_DETAIL_v214
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const step3 = readFileSync(resolve(__dirname, "..", "Step3_Business.tsx"), "utf-8");
const step4 = readFileSync(resolve(__dirname, "..", "Step4_Applicant.tsx"), "utf-8");

describe("Form 912 detail fields", () => {
  it.each(["sba912Q8", "sba912Q9", "sba912Q10"])("%s asks for detail on Yes", (q) => {
    expect(step4).toContain(`data.${q} === "yes"`);
    expect(step4).toContain(`setField("${q}Detail"`);
  });

  it("each prompt says what to write, not just 'details'", () => {
    expect(step4).toContain("Charge or offence, date, jurisdiction, and current status");
    expect(step4).toContain("Offence, date, jurisdiction, and the outcome");
    expect(step4).toContain("Amount outstanding, jurisdiction, and any arrangement in place");
  });

  it("nothing renders when the answer is No", () => {
    // Gated on an explicit "yes", so an unanswered or No question shows nothing.
    expect(step4).not.toContain('data.sba912Q8 !== "no"');
  });
});

describe("Form 1919 criminal question", () => {
  it("asks for detail on Yes", () => {
    expect(step3).toContain('values.sbaQ4Criminal === "yes"');
    expect(step3).toContain('setField("sbaQ4CriminalDetail"');
  });

  it("keeps the ineligibility warning alongside it", () => {
    expect(step3).toContain("ineligible for 7(a)");
  });
});

describe("the mini-portal is no longer where this is asked", () => {
  it("the detail is captured in the wizard", () => {
    const wizardFields = [
      "sba912Q8Detail",
      "sba912Q9Detail",
      "sba912Q10Detail",
    ];
    for (const f of wizardFields) expect(step4).toContain(f);
    expect(step3).toContain("sbaQ4CriminalDetail");
  });
});
