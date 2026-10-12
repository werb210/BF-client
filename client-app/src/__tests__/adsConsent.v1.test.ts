// BF_CLIENT_ADS_CONSENT_v1
// Consent Mode defaults now come from lib/thirdPartyTags.ts loadGoogleTags()
// (web only) instead of an inline block in index.html.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GOOGLE_ADS_ID, loadGoogleTags } from "@/lib/thirdPartyTags";
import ConsentBanner from "@/components/ConsentBanner";

type TagWindow = Window & { dataLayer?: unknown[]; gtag?: unknown };

function consentCalls(kind: "default" | "update"): Array<Record<string, unknown>> {
  const layer = (window as TagWindow).dataLayer || [];
  return layer
    .map((entry) => Array.from(entry as ArrayLike<unknown>))
    .filter((args) => args[0] === "consent" && args[1] === kind)
    .map((args) => args[2] as Record<string, unknown>);
}

function resetTags(): void {
  const w = window as TagWindow;
  delete w.gtag;
  delete w.dataLayer;
  document.head.innerHTML = "";
  localStorage.clear();
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  resetTags();
});

afterEach(() => {
  resetTags();
});

describe("consent defaults", () => {
  it("lets the Apply conversion be attributed by default", () => {
    // The conversion fires on wizard submit, before most applicants ever touch
    // the banner. With ad_storage denied it was recorded as modelled, not
    // attributed: 52 applications produced 2 recorded conversions.
    loadGoogleTags();
    const [defaults] = consentCalls("default");
    expect(defaults.ad_storage).toBe("granted");
    expect(defaults.ad_user_data).toBe("granted");
  });

  it("keeps ads consent consistent with analytics consent", () => {
    // Both rest on the same implied-consent basis; defaulting one granted and
    // the other denied was an inconsistency, not a decision.
    loadGoogleTags();
    expect(consentCalls("default")[0].analytics_storage).toBe("granted");
  });

  it("leaves personalised remarketing off", () => {
    loadGoogleTags();
    expect(consentCalls("default")[0].ad_personalization).toBe("denied");
  });

  it("still lets the banner revoke every consent key", async () => {
    loadGoogleTags();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root: Root = createRoot(host);
    await act(async () => {
      root.render(createElement(ConsentBanner));
    });
    const decline = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Decline");
    if (!decline) throw new Error("Decline button not rendered");
    await act(async () => decline.click());
    const [revoked] = consentCalls("update");
    expect(revoked).toMatchObject({
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "denied",
      ad_personalization: "denied",
    });
    act(() => root.unmount());
    host.remove();
  });

  it("keeps the Google Ads base tag loaded", () => {
    loadGoogleTags();
    expect(GOOGLE_ADS_ID).toBe("AW-18248196538");
    const srcs = Array.from(document.querySelectorAll("script")).map((s) => s.getAttribute("src") || "");
    expect(srcs).toContain("https://www.googletagmanager.com/gtag/js?id=AW-18248196538");
  });
});
