import { getPersistedAttribution } from "./attribution";
import { apiCall } from "@/api/client";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import { isDevMode } from "@/config/env";

export function track(event: string) {
  if (isDevMode()) {
    void event;
  }
}

// ---- Client Attribution Sync ----

// ---- Consent Sync Layer ----

const CONSENT_KEY = "boreal_cookie_consent";

const hasTrackingConsent = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "accepted";
};

// ---- Session Intelligence ----
const SESSION_KEY = "boreal_session_id";

const generateSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getSessionId = () => {
  if (typeof window === "undefined") return "server";

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
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
