export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export const API_PATHS = {
  AUTH_START: '/api/auth/otp/start',
  AUTH_VERIFY: '/api/auth/otp/verify',
  AUTH_ME: '/api/auth/me',
  APPLICATIONS: '/api/applications',
  DOCUMENT_UPLOAD: '/api/documents/upload',
  CLIENT_LENDERS: '/api/lenders',
  CLIENT_LENDER_PRODUCTS: '/api/lender-products',
  CLIENT_SESSION_REFRESH: '/api/session/refresh',
} as const;
