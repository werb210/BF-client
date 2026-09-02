// BF_CLIENT_BRAND_v167 - the apply hand-off is where a visitor decides whether
// this is the same company they just read about. Guard the alignment.
import { describe, it, expect } from "vitest";
import fs from "fs";

const LANDING = fs.readFileSync("src/pages/LandingPage.tsx", "utf8");
const LANDING_CSS = fs.readFileSync("src/components/landing/landing-shell.css", "utf8");

describe("landing page matches BF-Website positioning", () => {
  it("drops the retired boutique-advisory headline", () => {
    expect(LANDING).not.toContain("Professional Business Financing Solutions");
    expect(LANDING).not.toContain("tailored financing");
    expect(LANDING).not.toContain("perfect funding");
  });

  it("uses the approved mobile-shell positioning at the point of hand-off", () => {
    expect(LANDING).toContain("Business financing,");
    expect(LANDING).toContain("made simple.");
    expect(LANDING).toContain("Access the right financing options for your business.");
  });

  it("uses the website brand tokens, not the old generic palette", () => {
    expect(LANDING_CSS).toContain("var(--boreal-blue)");
    expect(LANDING_CSS).toContain("var(--boreal-blue-light)");
    expect(LANDING_CSS).not.toContain("#0B1320");
  });

  it("makes no claim the website does not make", () => {
    expect(LANDING).not.toMatch(/\bAPR\b|guaranteed|pre-approved|approval rate/i);
  });
});

describe("design tokens", () => {
  for (const cfg of ["tailwind.config.js", "tailwind.config.ts"]) {
    it(`${cfg} carries the BF-Website palette`, () => {
      const src = fs.readFileSync(cfg, "utf8");
      expect(src).toContain("#0B1F3A");
      expect(src).toContain("#BF9B49");
      expect(src).toContain("Libre Caslon Text");
      expect(src).not.toContain("#F97316");
    });
  }

  it("index.html loads the brand faces without blocking render", () => {
    const html = fs.readFileSync("index.html", "utf8");
    expect(html).toContain("Libre+Caslon+Text");
    expect(html).toContain('media="print"');
  });
});
