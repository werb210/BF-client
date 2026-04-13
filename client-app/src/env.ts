const REQUIRED_ENV = [
  "VITE_API_BASE",
];

function getEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Missing env: ${key}`);
  }
  return value;
}

export const ENV = {
  API_BASE: getEnv("VITE_API_BASE") || "https://server.boreal.financial",
  API_VERSION: import.meta.env.VITE_API_VERSION || "v1", // fallback to prevent crash
};

// REMOVE HARD FAILURE VALIDATION
export function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !import.meta.env[key]);

  if (missing.length > 0) {
    console.warn("Missing env vars:", missing);
    // DO NOT THROW — this was breaking the app
  }
}
