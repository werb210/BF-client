import { apiCall } from "@/lib/apiClient";

type ApiResponse<T = unknown> = {
  data: T;
  status: number;
  headers: Headers;
};

type RequestConfig = {
  url: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function normalizePath(path: string) {
  if (path.startsWith("/api/")) return path;
  return `/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function send<T = unknown>(method: string, path: string, data?: unknown, init?: any): Promise<ApiResponse<T>> {
  const payload = await apiCall<T>(normalizePath(path), { ...init, method, body: data });
  return { data: payload, status: 200, headers: new Headers() };
}

async function request<T = unknown>(urlOrConfig: string | RequestConfig, init?: any): Promise<ApiResponse<T>> {
  if (typeof urlOrConfig === "string") {
    return send<T>(init?.method || "GET", urlOrConfig, init?.body, init);
  }

  const { url, method = "GET", data, headers, signal } = urlOrConfig;
  return send<T>(method, url, data, { headers, signal });
}

export const apiClient = {
  request,
  get: <T = unknown>(url: string, init?: any) => send<T>("GET", url, undefined, init),
  post: <T = unknown>(url: string, data?: unknown, init?: any) => send<T>("POST", url, data, init),
  patch: <T = unknown>(url: string, data?: unknown, init?: any) => send<T>("PATCH", url, data, init),
  put: <T = unknown>(url: string, data?: unknown, init?: any) => send<T>("PUT", url, data, init),
  delete: <T = unknown>(url: string, init?: any) => send<T>("DELETE", url, undefined, init),
};

export { apiCall };

export function buildApiUrl(path: string): string {
  return normalizePath(path);
}

export default apiClient;
