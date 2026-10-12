// BF_CLIENT_v789_DEAD_CODE - one list of the BF-Server routes this app calls by
// name, all under https://server.boreal.financial/api/ (no /v1/). Entries for
// routes nothing called (/api/telephony/token, /api/call/start,
// /api/client/documents/upload, /api/webhooks/signnow) and the old
// contracts/api-contract.ts list (/api/applications, /api/drafts/*,
// /api/preapp/*, /api/crm/leads, /api/client/continuation) are gone.
export const endpoints = {
  otpStart: "/api/auth/otp/start",
  otpVerify: "/api/auth/otp/verify",
  clientApplications: "/api/client/applications",
  clientApplicationPrefix: "/api/client/applications/",
  readiness: "/api/readiness",
  crmWebLeads: "/api/crm/web-leads",
  publicLenderCount: "/api/public/lender-count",
  analytics: "/api/analytics",
} as const;
