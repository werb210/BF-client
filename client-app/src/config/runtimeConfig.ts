export type RuntimeConfig = {
  API_BASE: string;
};

const base = import.meta.env.VITE_API_URL;

if (!base) {
  throw new Error("VITE_API_URL missing");
}

export const runtimeConfig: RuntimeConfig = {
  API_BASE: `${base}/api/v1`,
};

export function ensureLockedApiBase(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("INVALID_API_PATH");
  }

  return path;
}
