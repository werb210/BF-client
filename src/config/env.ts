export const ENV = {
  API_URL: import.meta.env.VITE_API_URL,
};

export function getApiUrl(): string {
  if (!ENV.API_URL) {
    throw new Error('VITE_API_URL is not defined');
  }
  return ENV.API_URL;
}
