import { getPersistedAttribution } from "./attribution";
import { apiCall } from "@/api/client";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import { isDevMode } from "@/config/env";
import { normalizePhone } from "@/utils/normalizePhone";

export function track(event: string) {
  if (isDevMode()) {
    void event;
  }
}

// BF_CLIENT_CLARITY_IDENTIFY_v162
// Tag the Clarity session with the applicant's verified phone so staff can find
// this person's recording in the Clarity dashboard from their CRM record.
// `identify` sets the searchable custom id; `set` adds a filterable tag under a
// stable key. No-op (and never throws) when Clarity is not loaded on the page.
export function identifyClarity(phone: string): void {
  try {
    const c =
      typeof window !== "undefined" ? (window as any).clarity : undefined;
    if (typeof c !== "function") return;
    const digits = String(phone ?? "").replace(/[^0-9]/g, "");
    if (!digits) return;
    c("identify", digits);
    c("set", "phone", digits);
  } catch {
    // Analytics must never interrupt the applicant flow.
  }
}

// ---- Client Attribution Sync ----

// ---- Consent Sync Layer ----

const CONSENT_KEY = "boreal_cookie_consent";

const hasTrackingConsent = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
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

  void apiCall(API_ENDPOINTS_CONTRACT.ANALYTICS, {
    method: "POST",
    body: JSON.stringify({
      event_name: eventName,
      payload: {
        session_id: getSessionId(),
        ...attribution,
        ...payload,
      },
    }),
  }).catch((err) => {
    if (isDevMode()) {
      void err;
    }
  });
};

export const trackConversion = (
  eventName: string,
  payload: Record<string, any> = {}
) => {
  if (!hasTrackingConsent()) return;

  trackEvent(eventName, payload);
};

// ---- Client Revenue Modeling ----
const COMMISSION_RATE = 0.03; // Adjust later if needed

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
// A malformed phone must not prevent the remaining user data from being sent.
export const buildAdsUserData = (
  email?: string | null,
  phone?: string | null
): Record<string, string> => {
  const userData: Record<string, string> = {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (cleanEmail.includes("@")) userData.email = cleanEmail;

  try {
    const e164 = normalizePhone(String(phone || ""));
    if (e164) userData.phone_number = e164;
  } catch {
    // Preserve valid fields when the optional phone number is malformed.
  }

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
