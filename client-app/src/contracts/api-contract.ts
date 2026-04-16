export const API_ENDPOINTS_CONTRACT = {
  APPLICATION: {
    ROOT: "/api/applications",
    UPDATE: "/api/applications",
    CONTINUATION: "/api/client/continuation",
  },
  CLIENT_APPLICATIONS: {
    ROOT: "/api/client/applications",
    PREFIX: "/api/client/applications/",
  },
  CRM: {
    LEADS: "/api/crm/leads",
    WEB_LEADS: "/api/crm/web-leads",
  },
  PREAPP: {
    LOOKUP: "/api/preapp/lookup",
    CONSUME: "/api/preapp/consume",
  },
  READINESS: {
    ROOT: "/api/readiness",
    CONTINUE: "/api/readiness/continue",
    SESSION_PREFIX: "/api/readiness/session/",
  },
  DRAFTS: {
    SAVE: "/api/drafts/save",
    PREFIX: "/api/drafts/",
  },
  PUBLIC: {
    LENDER_COUNT: "/api/public/lender-count",
  },
  ANALYTICS: "/api/analytics",
} as const;
