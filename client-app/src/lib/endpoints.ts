export const endpoints = {
  otpStart: "/api/auth/otp/start",
  otpVerify: "/api/auth/otp/verify",
  voiceToken: "/api/telephony/token",
  callStart: "/api/call/start",
} as const;

export const ENDPOINTS = {
  submitApplication: "/api/client/applications",
  uploadDocument: "/api/client/documents/upload",
  startSigning: "/api/webhooks/signnow",
} as const;
