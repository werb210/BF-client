export function validateEnv() {
  const url = import.meta.env.VITE_API_URL;

  if (!url) throw new Error('MISSING_API_URL');
  if (!url.includes('/api/v1')) {
    throw new Error('INVALID_API_VERSION');
  }
}
