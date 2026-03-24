export const API_CONTRACT = {
  BASE: "/api",
  AUTH: {
    OTP_START: "/api/auth/otp/start",
    OTP_VERIFY: "/api/auth/otp/verify",
    ME: "/api/auth/me"
  },
  DOCUMENTS: {
    UPLOAD: "/api/documents/upload"
  },
  APPLICATION: {
    ROOT: "/api/applications",
    UPDATE: "/api/applications/update",
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
  SUPPORT_EVENT: "/api/support/event",
  PUBLIC: {
    LENDER_COUNT: "/api/public/lender-count"
  }
} as const;
