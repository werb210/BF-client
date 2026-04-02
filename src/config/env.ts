function optional(name: string, value: string | undefined, fallback?: string) {
  if (value) return value;
  if (import.meta.env.MODE === 'test') return fallback ?? 'http://localhost';
  if (fallback) return fallback;
  throw new Error(`Missing env: ${name}`);
}

export const ENV = {
  API_URL: optional('VITE_API_URL', import.meta.env.VITE_API_URL, 'http://localhost:3000'),
  JWT_STORAGE_KEY: import.meta.env.VITE_JWT_STORAGE_KEY || 'bf_jwt_token',
};
