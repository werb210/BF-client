// BF_CLIENT_DESIGN_v172 - the wizard renders from tokens.ts and components.ts,
// so these two files are the whole design system for the application flow.
import { describe, it, expect } from "vitest";
import fs from "fs";

const TOKENS = fs.readFileSync("src/styles/tokens.ts", "utf8");
const COMPONENTS = fs.readFileSync("src/styles/components.ts", "utf8");
const CSS = fs.readFileSync("src/index.css", "utf8");

describe("typography matches BF-Website", () => {
  it("body is Public Sans, not Inter", () => {
    expect(TOKENS).toContain("'Public Sans'");
    expect(TOKENS).not.toContain("'Inter'");
  });

  it("headings are Libre Caslon Text", () => {
    expect(TOKENS).toContain("'Libre Caslon Text'");
    expect(COMPONENTS).toContain("fontFamily: tokens.typography.displayFamily");
  });

  it("the root stylesheet sets both faces", () => {
    expect(CSS).toContain('font-family: "Public Sans"');
    expect(CSS).toContain('font-family: "Libre Caslon Text"');
  });
});

describe("surfaces match BF-Website", () => {
  it("uses mist and ink, not the generic slate values", () => {
    expect(TOKENS).toContain('background: "#F5F8FC"');
    expect(TOKENS).toContain('textPrimary: "#0B1F3A"');
    expect(TOKENS).not.toContain("rgb(248 250 252)");
    expect(TOKENS).not.toContain("rgb(15 23 42)");
  });

  it("exposes the palette as CSS variables for non-token markup", () => {
    expect(CSS).toContain("--boreal-gold: #BF9B49");
    expect(CSS).toContain("--boreal-line: #E4EAF2");
  });
});

describe("step eyebrow matches the site", () => {
  it("is gold at the site's tracking, not grey", () => {
    expect(COMPONENTS).toContain('letterSpacing: "0.14em"');
    expect(COMPONENTS).toContain("color: tokens.colors.accent");
  });
});
