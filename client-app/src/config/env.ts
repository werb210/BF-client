type Env = {
  API_URL: string;
  JWT_STORAGE_KEY: string;
};

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("Missing VITE_API_URL");
}

export const env: Env = {
  API_URL,
  JWT_STORAGE_KEY: "bf_jwt_token",
};

export function getMode() {
  return import.meta.env.MODE;
}

export function isDevMode() {
  return getMode() === "development";
}

export function isTestMode() {
  return getMode() === "test";
}

export function validateEnv() {
  return env;
}
