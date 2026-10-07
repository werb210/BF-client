// BF_CLIENT_ONE_SIGNIN_ONLY_v743
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
function allFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === "__tests__" ? [] : allFiles(p)) : [p]; });
}

describe("there is exactly one sign-in screen", () => {
  it("the old OTP page is gone and nothing can render it", () => {
    expect(existsSync(join(root, "pages", "OtpPage.tsx"))).toBe(false);
    for (const f of allFiles(root).filter((p) => /\.(tsx?|jsx?)$/.test(p))) {
      const s = readFileSync(f, "utf8");
      expect(s.includes("pages/OtpPage"), f).toBe(false);
      expect(s.includes("Mobile Phone Number (E.164)"), f).toBe(false);
    }
  });
  it("/otp leads to the landing page", () => {
    expect(readFileSync(join(root, "router", "AppRouter.tsx"), "utf8")).toContain('<Route path="/otp" element={<OtpToLanding />} />');
  });
  it("the one sign-in screen does what the old page did after a code is verified", () => {
    const s = readFileSync(join(root, "components", "PhoneOTPInline.tsx"), "utf8");
    expect(s).toContain("sessionStorage.setItem('verified_phone', phoneE164); identifyClarity(phoneE164);");
    expect(s).toContain("purgeLegacyDrafts();");
    expect(s).toContain("adoptAnonDrafts(currentDraftScope());");
  });
});
