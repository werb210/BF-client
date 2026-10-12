import { getPersistedAttribution } from "./attribution";
import { isDevMode } from "@/config/env";
import { ENV } from "@/env";
import { endpoints } from "@/lib/endpoints";

export function track(event: string) {
  if (isDevMode()) {
    void event;
  }
}

// BF_CLIENT_v789_ANALYTICS_GATES - identifyClarity (BF_CLIENT_CLARITY_IDENTIFY_v162)
// tagged every Clarity recording with the applicant's phone number. It is gone:
// no phone number is sent to Clarity or any other analytics. Staff reach a
// recording from the CRM through the playback URL sent at application start
// (BF_CLIENT_CLARITY_PLAYBACK_v170).

// ---- Client Attribution Sync ----

// ---- Consent Sync Layer ----

// BF_CLIENT_CONSENT_KEY_FIX_v710 - the mounted banner (ConsentBanner.tsx) saves
// the choice under boreal_consent_v1 as granted/denied. This gate read the key of
// an older banner that is never shown ("boreal_cookie_consent" === "accepted"),
// so trackEvent never fired: application_started and
// client_application_submitted never reached GA4. Consent here is implied (the
// same basis as the index.html Consent Mode default): track unless the visitor
// declined. A legacy "declined" is still honoured.
export const CONSENT_KEY = "boreal_consent_v1";
const LEGACY_CONSENT_KEY = "boreal_cookie_consent";

export const hasTrackingConsent = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(CONSENT_KEY) === "denied") return false;
    if (localStorage.getItem(LEGACY_CONSENT_KEY) === "declined") return false;
    return true;
  } catch {
    return false;
  }
};

// ---- Session Intelligence ----
const SESSION_KEY = "boreal_session_id";

const generateSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

// BF_CLIENT_BLOCK_v865_STORAGE_SAFE — in-memory fallback when localStorage is
// blocked (private mode / corporate policy / partitioned storage). Never throw
// into callers such as the submit critical path.
let inMemorySessionId: string | null = null;

export const getSessionId = () => {
  if (typeof window === "undefined") return "server";

  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateSessionId();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    if (!inMemorySessionId) inMemorySessionId = generateSessionId();
    return inMemorySessionId;
  }
};

export const getLeadFingerprint = () => {
  if (typeof window === "undefined") {
    return {
      session_id: getSessionId(),
    };
  }

  return {
    user_agent: navigator.userAgent,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    browser_online: navigator.onLine,
    webdriver: Boolean(navigator.webdriver),
    session_id: getSessionId(),
  };
};

export const getClientAttribution = () => {
  return getPersistedAttribution();
};

export const trackEvent = (
  eventName: string,
  payload: Record<string, any> = {}
) => {
  if (!hasTrackingConsent()) return;

  const attribution = getClientAttribution();

  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, payload);
  }

  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      timestamp: Date.now(),
      app: "client",
      session_id: getSessionId(),
      ...attribution,
      ...payload,
    });
  }

  if (typeof window !== "undefined" && window.clarity) {
    window.clarity("set", eventName, payload);
  }

  void postAnalyticsEvent({
    event_name: eventName,
    payload: {
      session_id: getSessionId(),
      ...attribution,
      ...payload,
    },
  });
};

// BF_CLIENT_v789_ANALYTICS_ENDPOINT - first-party events go to the API origin
// (https://server.boreal.financial/api/analytics, mounted by BF-Server v789),
// not to a path relative to wherever the app is served (the native apps serve
// it from capacitor:// and https://localhost). A failure is never shown to the
// applicant and never retried; in development it is logged with console.warn.
export function analyticsUrl(): string {
  const base = String(ENV.API_BASE || "https://server.boreal.financial").replace(/\/+$/, "");
  return `${base}${endpoints.analytics}`;
}

export async function postAnalyticsEvent(body: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(analyticsUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (!res.ok && isDevMode()) {
      console.warn("[analytics] event rejected", res.status);
    }
  } catch (err) {
    if (isDevMode()) {
      console.warn("[analytics] event not sent", err);
    }
  }
}

export const trackConversion = (
  eventName: string,
  payload: Record<string, any> = {}
) => {
  if (!hasTrackingConsent()) return;

  trackEvent(eventName, payload);
};

// ---- Client Revenue Modeling ----
// BF_CLIENT_COMMISSION_DEFAULT_2PCT_v721 - Boreal's default commission is 2% (value sent to Google Analytics / Ads).
const COMMISSION_RATE = 0.02;

// BF_CLIENT_ADS_CONVERSION_VALUE_v2
// Report estimated commission (our revenue), rather than the requested loan
// amount, so Google Ads can optimize bids toward application value.
export const ADS_CONVERSION_SEND_TO = "AW-18248196538/cfD0CI2m9M8cELrDtf1D";

export const buildAdsConversionPayload = (
  estimatedCommission: number,
  transactionId?: string | null
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    send_to: ADS_CONVERSION_SEND_TO,
  };

  if (Number.isFinite(estimatedCommission) && estimatedCommission > 0) {
    payload.value = Math.round(estimatedCommission * 100) / 100;
    payload.currency = "CAD";
  }

  const id = String(transactionId || "").trim();
  if (id) payload.transaction_id = id;

  return payload;
};

// BF_CLIENT_ADS_ENHANCED_CONVERSIONS_v3
// Google requires normalized contact data for enhanced conversion matching.
// BF_CLIENT_v789_ANALYTICS_GATES - the email only: a phone number is never sent
// to Google Ads, Clarity or any other analytics.
export const buildAdsUserData = (email?: string | null): Record<string, string> => {
  const userData: Record<string, string> = {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (cleanEmail.includes("@")) userData.email = cleanEmail;
  return userData;
};

export const estimateClientCommission = (
  requestedAmount: number
): number => {
  return requestedAmount * COMMISSION_RATE;
};

export const calculateApplicationQuality = (data: {
  revenue: number;
  timeInBusiness: number;
  creditScore?: number;
}) => {
  let score = 0;

  if (data.revenue > 1000000) score += 2;
  else if (data.revenue > 250000) score += 1;

  if (data.timeInBusiness > 24) score += 2;
  else if (data.timeInBusiness > 12) score += 1;

  if (data.creditScore && data.creditScore > 700) score += 2;
  else if (data.creditScore && data.creditScore > 650) score += 1;

  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
};

// ---- Underwriting Readiness Engine ----

let underwritingScore = 0;

export const incrementUnderwritingScore = (points: number) => {
  underwritingScore += points;
};

export const classifyReadiness = () => {
  if (underwritingScore >= 8) return "ready";
  if (underwritingScore >= 4) return "partial";
  return "low";
};
