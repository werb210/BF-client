import { apiRequest } from "@/lib/apiClient";

type ApiResponse<T = unknown> = {
  data: T;
  status: number;
  headers: Headers;
};

function normalizePath(path: string) {
  if (path.startsWith("/api/") || path.startsWith("/health")) return path;
  return `/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function send<T = unknown>(method: string, path: string, data?: unknown, init?: RequestInit): Promise<ApiResponse<T>> {
  const body = data instanceof FormData ? data : data == null ? undefined : JSON.stringify(data);
  const payload = await apiRequest(normalizePath(path), { ...init, method, body });
  return { data: payload as T, status: 200, headers: new Headers() };
}

export const apiClient = {
  get: <T = unknown>(url: string, init?: RequestInit) => send<T>("GET", url, undefined, init),
  post: <T = unknown>(url: string, data?: unknown, init?: RequestInit) => send<T>("POST", url, data, init),
  patch: <T = unknown>(url: string, data?: unknown, init?: RequestInit) => send<T>("PATCH", url, data, init),
  put: <T = unknown>(url: string, data?: unknown, init?: RequestInit) => send<T>("PUT", url, data, init),
  delete: <T = unknown>(url: string, init?: RequestInit) => send<T>("DELETE", url, undefined, init),
};

export { apiRequest };

export function buildApiUrl(path: string): string {
  return normalizePath(path);
}

export default apiClient;
