// BF_CLIENT_SMS_DISCLOSURE_v690
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// BF_CLIENT_v809_SMS_UPDATES_CONSENT - the note now covers only the sign-in code; texts about the application need the
// separate, unticked "Text me updates" box (behaviour tested in smsUpdatesConsent.v809.test.tsx).
const DISCLOSURE = "We&apos;ll text a one-time sign-in code to this number.";

describe("text-message disclosure and simpler Step 6", () => {
  it("shows the disclosure where the mobile number is entered, on both sign-in screens", () => {
    for (const f of ["src/components/PhoneOTPInline.tsx"]) { // BF_CLIENT_ONE_SIGNIN_ONLY_v743 - the one sign-in screen
      const src = readFileSync(f, "utf8");
      expect(src).toContain(DISCLOSURE);
      expect(src).toContain('data-testid="sms-updates-consent-checkbox"');
      expect(src).not.toContain("By entering your mobile number, you agree");
    }
  });

  it("Step 6 has one required checkbox for all three agreements and one optional ad checkbox", () => {
    const step6 = readFileSync("src/wizard/Step6_Review.tsx", "utf8");
    expect(step6).toContain('data-testid="agree-all-terms"');
    expect(step6).toContain("update({ termsAccepted: !allAgreed, shareAuthorization: !allAgreed, infoConfirmed: !allAgreed })");
    expect(step6.match(/<Checkbox /g)?.length).toBe(3); // BF_CLIENT_v808_MARKETING_OPTIN - plus the optional "Text me offers" box
    expect(step6).not.toContain("Boreal Insurance");
    expect(step6).not.toContain("such as Google");
    expect(step6).not.toContain("marketing opportunities");
    expect(readFileSync("src/wizard/submission.ts", "utf8")).toContain("audience_match_consent: app.adMeasurementConsent === true,");
  });
});
