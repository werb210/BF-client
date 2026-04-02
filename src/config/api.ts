const base =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'test'
    ? 'http://localhost:3000'
    : undefined);

if (!base) {
  throw new Error('VITE_API_URL missing');
}

export const API_BASE = base;

export function assertApiEnv() {
  if (!API_BASE) {
    throw new Error('API not configured');
  }
}
