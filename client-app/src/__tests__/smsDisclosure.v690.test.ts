// BF_CLIENT_SMS_DISCLOSURE_v690
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const DISCLOSURE = "By entering your mobile number, you agree to receive text messages from Boreal Financial about your application";

describe("text-message disclosure and simpler Step 6", () => {
  it("shows the disclosure where the mobile number is entered, on both sign-in screens", () => {
    for (const f of ["src/components/PhoneOTPInline.tsx"]) { // BF_CLIENT_ONE_SIGNIN_ONLY_v743 - the one sign-in screen
      const src = readFileSync(f, "utf8");
      expect(src).toContain(DISCLOSURE);
      expect(src).toContain("Reply STOP to opt out or HELP for help.");
    }
  });

  it("Step 6 has one required checkbox for all three agreements and one optional ad checkbox", () => {
    const step6 = readFileSync("src/wizard/Step6_Review.tsx", "utf8");
    expect(step6).toContain('data-testid="agree-all-terms"');
    expect(step6).toContain("update({ termsAccepted: !allAgreed, shareAuthorization: !allAgreed, infoConfirmed: !allAgreed })");
    expect(step6.match(/<Checkbox /g)?.length).toBe(2);
    expect(step6).not.toContain("Boreal Insurance");
    expect(step6).not.toContain("such as Google");
    expect(step6).not.toContain("marketing opportunities");
    expect(readFileSync("src/wizard/submission.ts", "utf8")).toContain("audience_match_consent: app.adMeasurementConsent === true,");
  });
});
