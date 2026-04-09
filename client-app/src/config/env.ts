import { ENV } from "@/env";

export type AppMode = "development" | "test" | "production";

export function getMode(): AppMode {
  return import.meta.env.MODE as AppMode;
}

export const isDevMode = (): boolean => getMode() === "development";
export const isTestMode = (): boolean => getMode() === "test";

export function validateEnv() {
  if (import.meta.env.DEV) {
    if (!ENV.API_BASE_URL) {
      throw new Error("Missing VITE_API_BASE_URL");
    }

    if (!ENV.API_VERSION) {
      throw new Error("Missing VITE_API_VERSION");
    }
  }

  return {
    mode: getMode(),
    apiUrl: ENV.API_BASE_URL,
    apiVersion: ENV.API_VERSION,
  };
}

export const env = {
  API_URL: ENV.API_BASE_URL,
  API_VERSION: ENV.API_VERSION,
};
