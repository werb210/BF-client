export type Env = {
  API_URL: string;
  JWT_STORAGE_KEY: string;
  MODE: string;
};

function getEnv(): Env {
  if (!import.meta.env.VITE_API_URL) {
    throw new Error("Missing VITE_API_URL");
  }

  return {
    API_URL: import.meta.env.VITE_API_URL,
    JWT_STORAGE_KEY: "bf_jwt_token",
    MODE: import.meta.env.MODE,
  };
}

export const env = getEnv();

export function getMode() {
  return env.MODE;
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
