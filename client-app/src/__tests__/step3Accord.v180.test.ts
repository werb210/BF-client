// BF_CLIENT_STEP3_ACCORD_v180 - the Accord LOC branch could block Continue
// while the summary said nothing, on the path with the most extra fields.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync("src/wizard/Step3_Business.tsx", "utf8");

describe("Accord fields report like every other field", () => {
  it("returns what is missing, not just whether", () => {
    expect(SRC).toContain("function missingAccordFields");
    expect(SRC).toContain('out.push("fiscal year end")');
    expect(SRC).toContain('out.push("mailing postal or ZIP code")');
  });

  it("folds them into the summary above Continue", () => {
    expect(SRC).toContain("...missingAccordFields(values)");
  });

  it("means the button and the message can never disagree", () => {
    expect(SRC).toContain("const isValid = missingStep3.length === 0;");
  });
});

describe("the gate itself is unchanged", () => {
  it("keeps accordRequirementsMet for its other call sites", () => {
    expect(SRC).toContain("function accordRequirementsMet");
    expect(SRC).toContain("return missingAccordFields(v).length === 0;");
  });

  it("still only applies on the Accord LOC branch", () => {
    expect(SRC).toContain("if (!isAccordLOC) return [];");
  });

  it("still only asks for a mailing address when it differs", () => {
    expect(SRC).toContain("if (v.mailingSameAsOperating === false) {");
  });
});
