export const API_BASE_URL =
  process.env.VITE_API_URL ||
  process.env.VITE_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  '/api';
