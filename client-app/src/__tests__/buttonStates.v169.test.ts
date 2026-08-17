// BF_CLIENT_UI_v169 - buttons were inline-styled, so they had no hover, active
// or focus states at all. Guard the classes and the palette.
import { describe, it, expect } from "vitest";
import fs from "fs";

const CSS = fs.readFileSync("src/components/ui/button.css", "utf8");
const BTN = fs.readFileSync("src/components/ui/Button.tsx", "utf8");
const TOKENS = fs.readFileSync("src/styles/tokens.ts", "utf8");

describe("button interactive states", () => {
  for (const state of [":hover", ":active", ":focus-visible", ":disabled"]) {
    it(`defines ${state}`, () => {
      expect(CSS).toContain(state);
    });
  }

  it("renders classes rather than inline colour", () => {
    expect(BTN).toContain("bf-btn");
    expect(BTN).not.toContain("opacity: 0.5");
    expect(BTN).not.toContain("VARIANT_STYLES");
  });

  it("still lets callers override with style", () => {
    expect(BTN).toContain("style={style}");
  });
});

describe("brand palette", () => {
  it("tokens use the BF-Website navy and gold", () => {
    expect(TOKENS).toContain("#0B1F3A");
    expect(TOKENS).toContain("#BF9B49");
  });

  it("the old generic indigo is gone", () => {
    expect(TOKENS).not.toContain("rgb(30 58 138)");
    expect(TOKENS).not.toContain("rgb(29 78 216)");
  });
});
