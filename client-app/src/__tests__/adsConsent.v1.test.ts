// BF_CLIENT_ADS_CONSENT_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const banner = readFileSync("src/components/ConsentBanner.tsx", "utf8");
const consentBlock = html.slice(html.indexOf("gtag('consent', 'default'"), html.indexOf("wait_for_update"));

describe("consent defaults", () => {
  it("lets the Apply conversion be attributed by default", () => {
    // The conversion fires on wizard submit, before most applicants ever touch
    // the banner. With ad_storage denied it was recorded as modelled, not
    // attributed: 52 applications produced 2 recorded conversions.
    expect(consentBlock).toContain("ad_storage: 'granted'");
    expect(consentBlock).toContain("ad_user_data: 'granted'");
  });

  it("keeps ads consent consistent with analytics consent", () => {
    // Both rest on the same implied-consent basis; defaulting one granted and
    // the other denied was an inconsistency, not a decision.
    expect(consentBlock).toContain("analytics_storage: 'granted'");
  });

  it("leaves personalised remarketing off", () => {
    expect(consentBlock).toContain("ad_personalization: 'denied'");
  });

  it("still lets the banner revoke every consent key", () => {
    expect(banner).toContain('ad_storage: granted ? "granted" : "denied"');
    expect(banner).toContain('ad_user_data: granted ? "granted" : "denied"');
    expect(banner).toContain('analytics_storage: granted ? "granted" : "denied"');
  });

  it("keeps the Google Ads base tag loaded", () => {
    expect(html).toContain("AW-18248196538");
  });
});
