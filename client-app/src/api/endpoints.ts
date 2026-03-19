import { API_PATHS } from "@/config/api";

export const API_ENDPOINTS = {
  OTP_START: API_PATHS.AUTH_START,
  OTP_VERIFY: API_PATHS.AUTH_VERIFY,
  AUTH_ME: API_PATHS.AUTH_ME,
  APPLICATIONS: API_PATHS.APPLICATIONS,
  DOCUMENT_UPLOAD: API_PATHS.DOCUMENT_UPLOAD,
  TELEPHONY_TOKEN: "/api/telephony/token",
  TELEPHONY_PRESENCE: "/api/telephony/presence",
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
