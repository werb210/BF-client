// BF_CLIENT_STEP5_OPTIONS_v174 - the two actions above the upload section are
// alternatives to uploading. Nothing on the page said so.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync("src/wizard/Step5_Documents.tsx", "utf8");

describe("step 5 presents three options", () => {
  it("explains the choice under the missing-documents list", () => {
    expect(SRC).toContain("You have three options.");
    expect(SRC).toContain("supply them");
    expect(SRC).toContain('data-testid="step5-options-intro"');
  });

  it("only shows the explainer when something is actually missing", () => {
    const intro = SRC.indexOf('data-testid="step5-options-intro"');
    const guard = SRC.lastIndexOf("missingRequiredDocs.length > 0", intro);
    expect(guard).toBeGreaterThan(-1);
  });

  it("separates the options with Or", () => {
    expect(SRC).toContain("function OptionSeparator");
    expect(SRC.match(/<OptionSeparator \/>/g)?.length).toBe(2);
  });

  it("keeps both actions", () => {
    expect(SRC).toContain("I will supply all required documents at a later time");
    expect(SRC).toContain("Have my accountant upload the documents");
  });
});

describe("the options read as buttons", () => {
  it("uses a navy border, not the hairline that read as a panel", () => {
    expect(SRC).toContain("border: `2px solid ${tokens.colors.primary}`");
    expect(SRC).not.toContain('border: `2px solid ${tokens.colors.border ?? "rgba(255,255,255,0.18)"}`');
  });
});
