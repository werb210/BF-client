// BF_CLIENT_AD_MEASUREMENT_CONSENT_v402
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("ad-measurement consent", () => {
  it("is an optional checkbox on Step 6 that does not gate submit", () => {
    const step6 = read("src/wizard/Step6_Review.tsx");
    expect(step6).toContain('data-testid="ad-measurement-consent"');
    expect(step6).toContain("update({ adMeasurementConsent: !app.adMeasurementConsent })");
    expect(step6).not.toContain("adMeasurementConsent &&");
  });
  it("is sent with the application, false unless ticked", () => {
    const sub = read("src/wizard/submission.ts");
    expect(sub).toContain("ad_measurement_consent: app.adMeasurementConsent === true,");
  });
});
