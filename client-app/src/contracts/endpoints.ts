export const API_ENDPOINTS_CONTRACT = {
  BASE: "",
  AUTH: {
    OTP_START: "/api/auth/otp/start",
    OTP_VERIFY: "/api/auth/otp/verify"
  },
  DOCUMENTS: {
    UPLOAD: "/api/documents/upload"
  },
  OFFERS: {
    ROOT: "/api/offers"
  },
  TELEPHONY: {
    TOKEN: "/api/telephony/token"
  },
  APPLICATION: {
    ROOT: "/api/applications",
    UPDATE: "/api/applications",
    CONTINUATION: "/api/applications/continuation"
  },
  READINESS: {
    ROOT: "/api/readiness",
    CONTINUE: "/api/readiness/continue",
    SESSION_PREFIX: "/api/readiness/"
  },
  DRAFTS: {
    SAVE: "/api/drafts/save",
    PREFIX: "/api/drafts/"
  },
  PREAPP: {
    LOOKUP: "/api/preapp/lookup",
    CONSUME: "/api/preapp/consume"
  },
  CRM: {
    LEADS: "/api/crm/leads",
    WEB_LEADS: "/api/crm/web-leads"
  },
  CLIENT_APPLICATIONS: {
    ROOT: "/api/applications",
    PREFIX: "/api/applications/"
  },
  ANALYTICS: "/api/analytics",
  PUBLIC: {
    LENDER_COUNT: "/api/public/lender-count"
  }
} as const;

export const AUTH_ENDPOINTS = {
  OTP_START: "/api/auth/otp/start",
  OTP_VERIFY: "/api/auth/otp/verify"
} as const;
