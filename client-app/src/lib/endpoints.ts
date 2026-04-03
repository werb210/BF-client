export const endpoints = {
  otpStart: "/api/auth/otp/start",
  otpVerify: "/api/auth/otp/verify",
  voiceToken: "/api/voice/token",
  callStart: "/api/call/start",
} as const;

export const ENDPOINTS = {
  submitApplication: "/application/create",
  uploadDocument: "/documents/upload",
  startSigning: "/signnow/initiate",
} as const;
