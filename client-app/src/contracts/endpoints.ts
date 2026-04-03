export const API_ENDPOINTS_CONTRACT = {
  BASE: "",
  AUTH: {
    OTP_START: "/api/auth/otp/start",
    OTP_VERIFY: "/api/auth/otp/verify"
  },
  DOCUMENTS: {
    UPLOAD: "/api/v1/documents/upload"
  },
  OFFERS: {
    ROOT: "/api/v1/offers"
  },
  TELEPHONY: {
    TOKEN: "/api/v1/voice/token"
  },
  APPLICATION: {
    ROOT: "/api/v1/applications",
    UPDATE: "/api/v1/applications",
    CONTINUATION: "/api/v1/applications/continuation"
  },
  READINESS: {
    ROOT: "/api/v1/readiness",
    CONTINUE: "/api/v1/readiness/continue",
    SESSION_PREFIX: "/api/v1/readiness/"
  },
  DRAFTS: {
    SAVE: "/api/v1/drafts/save",
    PREFIX: "/api/v1/drafts/"
  },
  PREAPP: {
    LOOKUP: "/api/v1/preapp/lookup",
    CONSUME: "/api/v1/preapp/consume"
  },
  CRM: {
    LEADS: "/api/v1/crm/lead",
    WEB_LEADS: "/api/v1/crm/web-leads"
  },
  CLIENT_APPLICATIONS: {
    ROOT: "/api/v1/applications",
    PREFIX: "/api/v1/applications/"
  },
  ANALYTICS: "/api/v1/analytics",
  PUBLIC: {
    LENDER_COUNT: "/api/v1/public/lender-count"
  }
} as const;

export const AUTH_ENDPOINTS = {
  OTP_START: "/api/auth/otp/start",
  OTP_VERIFY: "/api/auth/otp/verify"
} as const;
