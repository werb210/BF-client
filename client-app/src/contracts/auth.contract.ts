export const AUTH_CONTRACT = {
  OTP_START: "/api/auth/otp/start",
  OTP_VERIFY: "/api/auth/otp/verify"
} as const;

export type AuthEndpoints =
  typeof AUTH_CONTRACT[keyof typeof AUTH_CONTRACT];
