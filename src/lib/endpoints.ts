export const endpoints = {
  auth: {
    otpStart: '/api/auth/otp/start',
    otpVerify: '/api/auth/otp/verify',
  },
  calls: {
    start: '/api/v1/calls/start',
  },

  // Backward-compatible flat aliases
  submitApplication: '/api/v1/applications',
  uploadDocument: '/api/v1/documents/upload',
  startSigning: '/api/v1/signnow/initiate',
  otpStart: '/api/auth/otp/start',
  otpVerify: '/api/auth/otp/verify',
  callStart: '/api/v1/calls/start',
} as const;
