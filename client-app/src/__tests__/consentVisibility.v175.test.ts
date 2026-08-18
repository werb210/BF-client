// BF_CLIENT_CONSENT_v175 - these controls make a typed signature legally
// binding. A checkbox nobody can see is not an informed consent.
import { describe, it, expect } from "vitest";
import fs from "fs";

const COMPONENTS = fs.readFileSync("src/styles/components.ts", "utf8");
const STEP6 = fs.readFileSync("src/wizard/Step6_Review.tsx", "utf8");

describe("the checkbox is visible", () => {
  it("has a heavier edge than a text input", () => {
    const box = COMPONENTS.slice(COMPONENTS.indexOf("checkbox: {"), COMPONENTS.indexOf("card: {"));
    expect(box).toContain("border: `2px solid ${tokens.colors.textSecondary}`");
    expect(box).not.toContain("border: `1px solid ${tokens.colors.border}`");
  });

  it("is 20px, not 18px", () => {
    const box = COMPONENTS.slice(COMPONENTS.indexOf("checkbox: {"), COMPONENTS.indexOf("card: {"));
    expect(box).toContain('width: "20px"');
    expect(box).not.toContain('width: "18px"');
  });
});

describe("each consent reads as a required action", () => {
  it("sits in its own bordered row", () => {
    expect(STEP6).toContain("borderRadius: tokens.radii.md");
    expect(STEP6).toContain("cursor: \"pointer\"");
  });

  it("changes state visibly when ticked", () => {
    expect(STEP6).toContain("tcConsents[i].get() ? tokens.colors.accent : tokens.colors.border");
  });
});
