import { isTestMode } from "@/config/env";

export function logError(msg: unknown, ...meta: unknown[]) {
  if (isTestMode()) return;
  console.error(msg, ...meta);
}

export function logClientError(msg: unknown, ...meta: unknown[]) {
  logError(msg, ...meta);
}

export function logClientWarning(msg: unknown, ...meta: unknown[]) {
  if (isTestMode()) return;
  console.warn(msg, ...meta);
}
