export const API_ENDPOINTS_CONTRACT = {
  APPLICATION: {
    ROOT: "/api/v1/applications",
    UPDATE: "/api/v1/applications/update",
    CONTINUATION: "/api/v1/applications/continuation",
  },
  CLIENT_APPLICATIONS: {
    ROOT: "/api/v1/application/create",
    PREFIX: "/api/v1/applications/",
  },
  CRM: {
    LEADS: "/api/v1/crm/leads",
    WEB_LEADS: "/api/v1/crm/web-leads",
  },
  PREAPP: {
    LOOKUP: "/api/v1/preapp/lookup",
    CONSUME: "/api/v1/preapp/consume",
  },
  READINESS: {
    ROOT: "/api/v1/readiness",
    CONTINUE: "/api/v1/readiness/continue",
    SESSION_PREFIX: "/api/v1/readiness/session/",
  },
  DRAFTS: {
    SAVE: "/api/v1/drafts/save",
    PREFIX: "/api/v1/drafts/",
  },
  PUBLIC: {
    LENDER_COUNT: "/api/v1/public/lender-count",
  },
  ANALYTICS: "/api/v1/analytics",
} as const;
