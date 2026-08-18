// BF_CLIENT_PGI_v176 - the PGI radios were the only unstyled controls left in
// the wizard, and the faintest thing on the step where someone signs.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync("src/wizard/Step6_Review.tsx", "utf8");

describe("PGI options are visible", () => {
  it("sit in bordered rows like the consents", () => {
    const pgi = SRC.slice(SRC.indexOf('data-testid="step6-pgi-section"'), SRC.indexOf("Learn more about PGI"));
    expect(pgi).toContain("borderRadius: tokens.radii.md");
    expect(pgi).toContain("border: `1px solid ${selected ? tokens.colors.accent : tokens.colors.border}`");
  });

  it("use a gold dot, not the browser default blue", () => {
    expect(SRC).toContain("accentColor: tokens.colors.accent");
  });

  it("no longer render as bare unstyled radios", () => {
    expect(SRC).not.toContain('style={{ width: "auto", marginTop: 4 }}');
  });
});

describe("both choices survive", () => {
  it("keeps the opt-in and opt-out wording", () => {
    expect(SRC).toContain("Yes, send me PGI details with my offers");
    expect(SRC).toContain("No, I will proceed without PGI");
  });

  it("still writes pgiOptIn", () => {
    expect(SRC).toContain("update({ pgiOptIn: value })");
  });
});
