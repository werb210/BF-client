export const API_ENDPOINTS = {
  OTP_START: "/auth/otp/start",
  OTP_VERIFY: "/auth/otp/verify",
  AUTH_ME: "/auth/me",
  APPLICATIONS: "/applications",
  DOCUMENT_UPLOAD: "/documents/upload",
  TELEPHONY_TOKEN: "/telephony/token",
  TELEPHONY_PRESENCE: "/telephony/presence",
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
