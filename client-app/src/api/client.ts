import { apiFetch as baseApiFetch, buildUrl } from "@/lib/api";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  return baseApiFetch(path, options);
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

const buildMethodOptions = (method: string, data?: unknown, headers?: Record<string, string>) => {
  const isForm = typeof FormData !== "undefined" && data instanceof FormData;
  return {
    method,
    body: data == null ? undefined : isForm ? (data as BodyInit) : JSON.stringify(data),
    headers: isForm ? headers : { "Content-Type": "application/json", ...(headers || {}) }
  } as RequestInit;
};

export const apiClient = {
  interceptors: {
    request: { use: () => undefined },
    response: { use: () => undefined }
  },
  async request<T = unknown>(config: any): Promise<{ data: T; status: number }> {
    const data = await apiRequest<T>(config.url, buildMethodOptions((config.method || "GET").toUpperCase(), config.data, config.headers));
    return { data, status: 200 };
  },
  async get<T = unknown>(url: string): Promise<{ data: T; status: number }> {
    return { data: await apiRequest<T>(url), status: 200 };
  },
  async post<T = unknown>(url: string, data?: unknown, config?: any): Promise<{ data: T; status: number }> {
    return { data: await apiRequest<T>(url, buildMethodOptions("POST", data, config?.headers)), status: 200 };
  },
  async patch<T = unknown>(url: string, data?: unknown, config?: any): Promise<{ data: T; status: number }> {
    return { data: await apiRequest<T>(url, buildMethodOptions("PATCH", data, config?.headers)), status: 200 };
  },
  async put<T = unknown>(url: string, data?: unknown, config?: any): Promise<{ data: T; status: number }> {
    return { data: await apiRequest<T>(url, buildMethodOptions("PUT", data, config?.headers)), status: 200 };
  },
  async delete<T = unknown>(url: string): Promise<{ data: T; status: number }> {
    return { data: await apiRequest<T>(url, { method: "DELETE" }), status: 200 };
  }
};

export function buildApiUrl(path: string): string {
  return buildUrl(path);
}

export default apiClient;
