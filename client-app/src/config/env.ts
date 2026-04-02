import { runtimeConfig } from "./runtimeConfig";
import { logClientWarning } from "@/lib/logger";

export function validateEnv() {
  if (!runtimeConfig.API_BASE) {
    logClientWarning("Missing runtime config: API_BASE");
    return;
  }

  if (runtimeConfig.API_BASE !== "/api") {
    throw new Error("INVALID_API_BASE_CONFIGURATION");
  }
}
