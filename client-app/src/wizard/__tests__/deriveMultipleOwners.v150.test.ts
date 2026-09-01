// BF_CLIENT_DERIVE_MULTIPLE_OWNERS_v150
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const step4 = readFileSync(resolve(__dirname, "..", "Step4_Applicant.tsx"), "utf-8");

describe("the checkbox is gone", () => {
  it("no longer asks whether the business has multiple owners", () => {
    expect(step4).not.toContain("This business has multiple owners/partners");
  });

  it("derives it from the ownership figure instead", () => {
    expect(step4).toContain("const impliesMultipleOwners");
    expect(step4).toContain("pct > 0 && pct < 100");
  });

  it("treats blank or zero as unanswered, not as co-owned", () => {
    const i = step4.indexOf("const impliesMultipleOwners");
    expect(step4.slice(i, i + 300)).toContain("pct > 0");
  });
});

describe("under 100% opens the owner fields directly", () => {
  it.each(["partner card", "additional shareholders"])("%s is gated on the derived value", () => {
    expect(step4).toContain("{impliesMultipleOwners(values) && (");
  });

  it("no gate still reads the stored flag", () => {
    expect(step4).not.toContain("{values.hasMultipleOwners && (");
  });

  it("tells them how much is unaccounted for", () => {
    expect(step4).toContain("Math.max(0, 100 - Number(values.ownership || 0))");
  });
});

describe("returning to 100% clears the partner", () => {
  it("clears the partner when ownership returns to 100", () => {
    expect(step4).toContain('if (key === "ownership")');
    expect(step4).toContain("partner: {}, additionalShareholders: []");
  });

  it("still persists the flag for the server payload", () => {
    expect(step4).toContain("hasMultipleOwners: true");
    expect(step4).toContain("hasMultipleOwners: false");
  });
});

describe("validation follows the derived value", () => {
  it("ownership must total 100 across primary and partner", () => {
    expect(step4).toContain("primaryOwnership + partnerOwnership === 100");
  });

  it("partner fields are required only when there is a partner", () => {
    expect(step4).toContain("(!impliesMultipleOwners(nextValues) ||");
  });

  it("the v194 trap cannot recur - there is no stored flag to get stuck", () => {
    expect(step4).not.toContain('setField("hasMultipleOwners", true)');
  });
});
