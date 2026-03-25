export const API_ENDPOINTS_CONTRACT = {
  BASE: "",
  AUTH: {
    OTP_START: "/auth/otp/start",
    OTP_VERIFY: "/auth/otp/verify",
    ME: "/auth/me"
  },
  DOCUMENTS: {
    UPLOAD: "/documents/upload"
  },
  OFFERS: {
    ROOT: "/offers"
  },
  TELEPHONY: {
    TOKEN: "/telephony/token"
  },
  APPLICATION: {
    ROOT: "/applications",
    UPDATE: "/applications",
    CONTINUATION: "/applications/continuation"
  },
  READINESS: {
    ROOT: "/readiness",
    CONTINUE: "/readiness/continue",
    SESSION_PREFIX: "/readiness/"
  },
  DRAFTS: {
    SAVE: "/drafts/save",
    PREFIX: "/drafts/"
  },
  PREAPP: {
    LOOKUP: "/preapp/lookup",
    CONSUME: "/preapp/consume"
  },
  CRM: {
    LEADS: "/crm/leads",
    WEB_LEADS: "/crm/web-leads"
  },
  CLIENT_APPLICATIONS: {
    ROOT: "/applications",
    PREFIX: "/applications/"
  },
  ANALYTICS: "/analytics",
  PUBLIC: {
    LENDER_COUNT: "/public/lender-count"
  }
} as const;

export const AUTH_ENDPOINTS = {
  OTP_START: "/auth/otp/start",
  OTP_VERIFY: "/auth/otp/verify"
} as const;
