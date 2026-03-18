export const API_ENDPOINTS = {
  OTP_START: "/api/auth/otp/start",
  OTP_VERIFY: "/api/auth/otp/verify",
  AUTH_ME: "/api/auth/me",
  TELEPHONY_TOKEN: "/api/telephony/token",
  TELEPHONY_PRESENCE: "/api/telephony/presence",
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
