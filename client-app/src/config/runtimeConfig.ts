type RuntimeConfig = {
  API_BASE: string;
};

export const runtimeConfig: RuntimeConfig = {
  API_BASE: "/api",
};

export function ensureLockedApiBase(path: string): string {
  const base = runtimeConfig.API_BASE.trim();

  if (base !== "/api") {
    throw new Error("INVALID_API_BASE_CONFIGURATION");
  }

  if (!path.startsWith("/")) {
    throw new Error("INVALID_API_PATH");
  }

  if (path === base || path.startsWith(`${base}/`)) {
    return path;
  }

  return `${base}${path}`;
}
