export const API_CONTRACT = {
  BASE: "/api",

  AUTH: {
    OTP_START: "/api/auth/otp/start",
    OTP_VERIFY: "/api/auth/otp/verify"
  },

  DOCUMENTS: {
    UPLOAD: "/api/documents/upload"
  }
} as const;
