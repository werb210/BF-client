// BF_CLIENT_CHROME_v168 - Capacitor wraps this same build, so anything that
// should not appear in the app has to be gated explicitly.
import { describe, it, expect } from "vitest";
import fs from "fs";

const HEADER = fs.readFileSync("src/components/landing/LandingHeader.tsx", "utf8");
const FOOTER = fs.readFileSync("src/components/landing/LandingFooter.tsx", "utf8");
const PLATFORM = fs.readFileSync("src/lib/platform.ts", "utf8");

describe("native chrome", () => {
  it("platform detection cannot throw on web", () => {
    expect(PLATFORM).toContain("isNativePlatform");
    expect(PLATFORM).toContain("catch");
  });

  it("footer is not rendered inside the app", () => {
    expect(FOOTER).toContain("isNativeApp()");
    expect(FOOTER).toContain("return null");
  });

  it("header collapses to a logo-only bar inside the app", () => {
    expect(HEADER).toContain("isNativeApp()");
    const nativeBlock = HEADER.slice(HEADER.indexOf("if (isNativeApp())"), HEADER.indexOf("</header>"));
    expect(nativeBlock).not.toContain("boreal.financial/products");
    expect(nativeBlock).not.toContain("boreal.financial/contact");
  });
});

describe("the template markup is left alone", () => {
  it("footer still carries the BF-Website tokens verbatim", () => {
    expect(FOOTER).toContain("#0a1120");
    expect(FOOTER).toContain("bg-blue-600");
  });
});
