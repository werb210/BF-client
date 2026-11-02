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

// BF_CLIENT_v868_QUEBEC_CONSENT - Quebec's Law 25: Google Analytics and Google Ads cookies wait for consent from
// visitors in Quebec. Everywhere else Boreal serves (the rest of Canada and the US) Google runs on notice, with
// the banner's Decline as the opt-out. Clarity and Boreal's own visitor tracking are unchanged: they always wait
// for Accept (clarity.ts, journey.ts).
export type ConsentRegion = "QC" | "other";
export const REGION_TIMEOUT_MS = 1500;
const REGION_CACHE_KEY = "bf_privacy_region";

/**
 * Used only when the server cannot tell (no IP lookup, a timeout, an error). A browser in Quebec reports
 * America/Toronto (America/Montreal is the older name for the same zone), which also covers Ontario, so the zone
 * alone cannot pick out Quebec; a French (Canada) language alongside it nearly always does. That pair is treated
 * as Quebec and Google waits for consent. A French-speaking Ontarian gets the stricter treatment too, which errs
 * on the side of privacy. Anyone else is "other": Boreal serves only Canada and the US, and outside Quebec the
 * notice-and-opt-out basis applies.
 */
export function fallbackRegion(
  timeZone: string | undefined = safeTimeZone(),
  languages: readonly string[] = safeLanguages(),
): ConsentRegion {
  const easternCanada = timeZone === "America/Montreal" || timeZone === "America/Toronto";
  const frenchCanadian = languages.some((l) => String(l).toLowerCase() === "fr-ca");
  return easternCanada && frenchCanadian ? "QC" : "other";
}

function safeTimeZone(): string | undefined {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
}
function safeLanguages(): string[] {
  try {
    const n = navigator as Navigator & { languages?: readonly string[] };
    return [...(n.languages ?? []), n.language].filter(Boolean) as string[];
  } catch { return []; }
}

/** The server's answer ("QC" | "other" | "unknown"), or the browser fallback when it has none. */
export function resolveRegion(server: unknown): ConsentRegion {
  return server === "QC" || server === "other" ? server : fallbackRegion();
}

// BF_CLIENT_v868_QUEBEC_CONSENT - the same server the API client talks to (env.ts order), read when asked so this
// module has no import-time dependency on the env module.
function serverUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  return env.VITE_API_BASE || env.VITE_API_BASE_URL || env.VITE_API_URL || "https://server.boreal.financial";
}

let known: ConsentRegion | null = null;
let pending: Promise<ConsentRegion> | null = null;

/** The region if it is already known (this page, or earlier in this browser session); null otherwise. */
export function peekConsentRegion(): ConsentRegion | null {
  if (known) return known;
  try {
    const saved = sessionStorage.getItem(REGION_CACHE_KEY);
    if (saved === "QC" || saved === "other") known = saved;
  } catch { /* storage blocked: ask the server */ }
  return known;
}

/** Sets the region for this page (loadGoogleTags does this; tests use it too). */
export function primeConsentRegion(region: ConsentRegion): void {
  known = region;
  pending = Promise.resolve(region);
}

/** Asks GET /api/privacy/region once per page (cached for the browser session); never takes longer than 1.5 s. */
export function consentRegion(): Promise<ConsentRegion> {
  const ready = peekConsentRegion();
  if (ready) return Promise.resolve(ready);
  if (pending) return pending;
  pending = (async () => {
    let server: unknown = "unknown";
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl?.abort(), REGION_TIMEOUT_MS);
    try {
      const r = await fetch(`${serverUrl()}/api/privacy/region`, { credentials: "omit", signal: ctrl?.signal });
      if (r && r.ok) server = ((await r.json()) as { region?: unknown } | null)?.region;
    } catch { server = "unknown"; } finally { clearTimeout(timer); }
    const region = resolveRegion(server);
    // Only the server's own answer is kept for the session; a fallback guess is asked again on the next page.
    if (server === "QC" || server === "other") {
      try { sessionStorage.setItem(REGION_CACHE_KEY, region); } catch { /* ignore */ }
    }
    known = region;
    return region;
  })();
  return pending;
}

/**
 * Consent Mode v2 defaults, GTM and the Google Ads base tag. A no-op in the native apps.
 * Quebec: analytics and ad storage "denied" until the banner's Accept. Elsewhere: "granted" (implied consent),
 * and the banner's Decline revokes everything (ConsentBanner.tsx).
 */
export function loadGoogleTags(region: ConsentRegion): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (isNativeBuild()) return;
  const w = window as GtagWindow;
  if (w.gtag) return;
  primeConsentRegion(region);
  const quebec = region === "QC";
  const basis = quebec ? "denied" : "granted";
  w.dataLayer = w.dataLayer || [];
  // Consent Mode commands must be pushed as gtag()-style `arguments` objects.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    (w.dataLayer as unknown[]).push(arguments);
  };
  w.gtag("consent", "default", {
    // BF_CLIENT_ADS_CONSENT_v1: the ad keys follow analytics_storage on the same basis. Declining in the banner
    // revokes all of these. BF_CLIENT_v868_QUEBEC_CONSENT: in Quebec all four start denied until Accept.
    ad_storage: basis,
    analytics_storage: basis,
    ad_user_data: basis,
    ad_personalization: "denied", // personalised remarketing stays off until an explicit Accept
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });
  // The region lookup can finish after the app has already pushed to dataLayer (a saved banner choice, a route
  // page_view). Consent defaults must come before everything else, so move this one to the front.
  if (w.dataLayer.length > 1) w.dataLayer.unshift(w.dataLayer.pop());
  if (quebec) w.gtag("set", "ads_data_redaction", true); // no ad click identifiers while ad_storage is denied
  // Google Tag Manager (GA4 G-D1Y4105RXP is configured inside the container).
  w.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  addScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`);
  // BF_CLIENT_ADS_CONVERSION_v1 - Google Ads base tag for the Apply conversion.
  addScript(`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`);
  w.gtag("js", new Date());
  w.gtag("config", GOOGLE_ADS_ID);
}

/** Boot: find out whether the visitor is in Quebec, then load Google with the right defaults. Web only. */
export async function startGoogleTags(): Promise<void> {
  if (typeof window === "undefined" || isNativeBuild()) return;
  loadGoogleTags(await consentRegion());
}
