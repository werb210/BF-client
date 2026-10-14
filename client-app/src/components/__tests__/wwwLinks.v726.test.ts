// BF_CLIENT_WWW_LINKS_v726
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("website links use www", () => {
  it("never links to a page on the bare boreal.financial host, which 404s pages it does not know", () => {
    for (const p of ["src/pages/MiniPortalPage.tsx", "src/components/PhoneOTPInline.tsx"]) { // BF_CLIENT_ONE_SIGNIN_ONLY_v743 - OtpPage deleted
      const s = readFileSync(p, "utf8");
      expect(s).not.toContain('href="https://boreal.financial/');
    }
    // BF_CLIENT_v802_BOOK_IN_APP - booking happens in the app; the Settings links still use www.
    expect(readFileSync("src/components/cmp/CmpSettings.tsx", "utf8")).toContain('href="https://www.boreal.financial/privacy"');
  });
});
