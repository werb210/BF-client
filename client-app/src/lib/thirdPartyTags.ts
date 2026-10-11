// BF_CLIENT_v789_ANALYTICS_GATES
// Google Tag Manager, the Google Ads tag and Microsoft Clarity used to be
// inline <script>s in index.html. That loaded them inside the iOS and Android
// apps too (the native shell serves the same index.html), where the App Store
// privacy label declares no tracking, and it forced the Content-Security-Policy
// to allow inline script. They are injected from here instead, on the web only.
import { Capacitor } from "@capacitor/core";

export const GTM_CONTAINER_ID = "GTM-W2WF8X9P";
export const GOOGLE_ADS_ID = "AW-18248196538";

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

export function isNativeBuild(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function addScript(src: string): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  (document.head || document.documentElement).appendChild(script);
}

/**
 * Consent Mode defaults, GTM and the Google Ads base tag. A no-op in the native
 * apps. Consent Mode v2 - implied consent (CA); the banner's Decline revokes
 * everything (ConsentBanner.tsx).
 */
export function loadGoogleTags(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (isNativeBuild()) return;
  const w = window as GtagWindow;
  if (w.gtag) return;
  w.dataLayer = w.dataLayer || [];
  // Consent Mode commands must be pushed as gtag()-style `arguments` objects.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    (w.dataLayer as unknown[]).push(arguments);
  };
  w.gtag("consent", "default", {
    // BF_CLIENT_ADS_CONSENT_v1: the ad keys follow analytics_storage on the same
    // implied-consent basis. Declining in the banner revokes all of these, and
    // Quebec - where Law 25 applies - is excluded from the Canada campaign.
    ad_storage: "granted",
    analytics_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "denied", // personalised remarketing stays off
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });
  // Google Tag Manager (GA4 G-D1Y4105RXP is configured inside the container).
  w.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  addScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`);
  // BF_CLIENT_ADS_CONVERSION_v1 - Google Ads base tag for the Apply conversion.
  addScript(`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`);
  w.gtag("js", new Date());
  w.gtag("config", GOOGLE_ADS_ID);
}
