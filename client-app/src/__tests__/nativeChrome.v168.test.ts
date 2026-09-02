// BF_CLIENT_CHROME_v168 - Capacitor wraps this same build, so anything that
// should not appear in the app has to be gated explicitly.
import { describe, it, expect } from "vitest";
import fs from "fs";

const HEADER = fs.readFileSync("src/components/landing/LandingHeader.tsx", "utf8");
const FOOTER = fs.readFileSync("src/components/landing/LandingFooter.tsx", "utf8");
const PLATFORM = fs.readFileSync("src/lib/platform.ts", "utf8");
const MOBILE_SHELL = fs.readFileSync("src/components/landing/landing-shell.css", "utf8");

describe("native chrome", () => {
  it("platform detection cannot throw on web", () => {
    expect(PLATFORM).toContain("isNativePlatform");
    expect(PLATFORM).toContain("catch");
  });

  it("footer is not rendered inside the app", () => {
    expect(FOOTER).toContain("isNativeApp()");
    expect(FOOTER).toContain("return null");
  });

  it("uses the same route-backed mobile shell inside the app", () => {
    expect(HEADER).not.toContain("boreal.financial/products");
    expect(HEADER).toContain('to: "/portal"');
    expect(MOBILE_SHELL).toContain("env(safe-area-inset-top)");
  });
});

describe("the template markup is left alone", () => {
  it("footer still carries the BF-Website tokens verbatim", () => {
    expect(FOOTER).toContain("#0a1120");
    expect(FOOTER).toContain("bg-blue-600");
  });
});
