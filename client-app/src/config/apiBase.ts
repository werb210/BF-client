declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      API_BASE_URL?: string;
    };
  }
}

function normalizeBase(input?: string): string {
  const value = (input || "").trim();
  if (!value) return "";

  if (value === "/api") {
    return "";
  }

  return value.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

function resolveConfiguredBase(): string {
  const runtimeBase = normalizeBase(window.RUNTIME_CONFIG?.API_BASE_URL);
  const envBase =
    normalizeBase(import.meta.env.VITE_API_BASE_URL) ||
    normalizeBase(import.meta.env.VITE_API_URL);
  return runtimeBase || envBase;
}

export function resolveApiBase(): string {
  const configuredBase = resolveConfiguredBase();

  if (configuredBase) {
    return configuredBase;
  }

  return "";
}

export const API_BASE = resolveApiBase();
