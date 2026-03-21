const RAW =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL;

if (!RAW) {
  throw new Error("Missing API base URL");
}

const BASE = RAW.replace(/\/+$/, "");

export const API_BASE = BASE.endsWith("/api")
  ? BASE
  : `${BASE}/api`;

export function buildUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
