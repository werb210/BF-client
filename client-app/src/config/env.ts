import { runtimeConfig } from "./runtimeConfig";

export function validateEnv() {
  if (!runtimeConfig.API_BASE) {
    throw new Error("VITE_API_URL missing");
  }
}
