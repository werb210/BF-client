import { ENV } from "@/env";

export type AppMode = "development" | "test" | "production";

export function getMode(): AppMode {
  return import.meta.env.MODE as AppMode;
}

export const isDevMode = (): boolean => getMode() === "development";
export const isTestMode = (): boolean => getMode() === "test";

export function validateEnv() {
  if (import.meta.env.DEV) {
    if (!ENV.API_BASE) {
      console.warn("Missing VITE_API_BASE");
    }

    if (!ENV.API_VERSION) {
      console.warn("Missing VITE_API_VERSION");
    }
  }

  return {
    mode: getMode(),
    apiUrl: ENV.API_BASE,
    apiVersion: ENV.API_VERSION,
  };
}

export const env = {
  API_URL: ENV.API_BASE,
  API_VERSION: ENV.API_VERSION,
};
