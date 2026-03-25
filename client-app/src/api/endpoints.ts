import { API_ENDPOINTS_CONTRACT, DOCUMENT_CONTRACT } from "@/contracts";

export const API_ENDPOINTS = {
  OTP_START: "/auth/otp/start",
  OTP_VERIFY: "/auth/otp/verify",
  AUTH_ME: "/auth/me",
  APPLICATIONS: API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.ROOT,
  DOCUMENT_UPLOAD: DOCUMENT_CONTRACT.UPLOAD,
  TELEPHONY_TOKEN: "/telephony/token"
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
