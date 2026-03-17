import { runtimeConfig } from "./runtimeConfig";
import { logClientWarning } from "@/lib/logger";

export function validateEnv() {
  if (!runtimeConfig.API_BASE) {
    logClientWarning("Missing runtime config: API_BASE");
  }
}
