// BF_CLIENT_DESIGN_v173 - a form where the button rings gold and the field
// above it rings navy reads as two design systems on one screen.
import { describe, it, expect } from "vitest";
import fs from "fs";

const TOKENS = fs.readFileSync("src/styles/tokens.ts", "utf8");
const COMPONENTS = fs.readFileSync("src/styles/components.ts", "utf8");
const BUTTON_CSS = fs.readFileSync("src/components/ui/button.css", "utf8");

describe("one focus ring across every control", () => {
  it("fields use the same gold ring as the buttons", () => {
    expect(TOKENS).toContain("rgba(191, 155, 73, 0.45)");
    expect(BUTTON_CSS).toContain("rgba(191, 155, 73, 0.45)");
  });

  it("dropped the old off-brand navy ring", () => {
    expect(TOKENS).not.toContain("rgba(11, 42, 74, 0.2)");
  });

  it("a focused field borders gold", () => {
    expect(COMPONENTS).toContain("borderColor: tokens.colors.accent");
  });
});

describe("surfaces and states", () => {
  it("the resting border is the brand hairline", () => {
    expect(COMPONENTS).toContain("border: `1.5px solid ${tokens.colors.border}`");
  });

  it("the checked box is gold with a navy tick, like the primary button", () => {
    expect(COMPONENTS).toContain("background: tokens.colors.accent");
    expect(COMPONENTS).toContain("stroke='%230B1F3A'");
    expect(COMPONENTS).not.toContain("stroke='%23FFFFFF'");
  });

  it("error red matches the one Step 4 renders inline", () => {
    expect(TOKENS).toContain('error: "#b3261e"');
  });
});
