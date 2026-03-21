const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL;

if (!RAW_BASE) {
  throw new Error("Missing API base URL. Expected VITE_API_BASE_URL or VITE_API_URL.");
}

const BASE = RAW_BASE.replace(/\/+$/, "");

export const API_BASE = BASE.endsWith("/api")
  ? BASE
  : `${BASE}/api`;

export function buildUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
