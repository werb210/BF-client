export const endpoints = {
  otpStart: "/api/auth/otp/start",
  otpVerify: "/api/auth/otp/verify",
  voiceToken: "/api/v1/voice/token",
  callStart: "/api/v1/call/start",
} as const;

export const ENDPOINTS = {
  submitApplication: "/api/v1/application/create",
  uploadDocument: "/api/v1/documents/upload",
  startSigning: "/api/v1/signnow/initiate",
} as const;
