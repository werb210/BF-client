export const endpoints = {
  otpStart: "/api/auth/otp/start",
  otpVerify: "/api/auth/otp/verify",
  voiceToken: "/api/v1/telephony/token",
  callStart: "/api/v1/call/start",
} as const;

export const ENDPOINTS = {
  submitApplication: "/api/client/applications",
  uploadDocument: "/api/client/documents/upload",
  startSigning: "/api/webhooks/signnow",
} as const;
