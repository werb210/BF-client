// BF_CLIENT_WWW_LINKS_v726
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("website links use www", () => {
  it("never links to a page on the bare boreal.financial host, which 404s pages it does not know", () => {
    for (const p of ["src/pages/MiniPortalPage.tsx", "src/components/PhoneOTPInline.tsx"]) { // BF_CLIENT_ONE_SIGNIN_ONLY_v743 - OtpPage deleted
      const s = readFileSync(p, "utf8");
      expect(s).not.toContain('href="https://boreal.financial/');
    }
    expect(readFileSync("src/pages/MiniPortalPage.tsx", "utf8")).toContain('href="https://www.boreal.financial/book"');
  });
});
