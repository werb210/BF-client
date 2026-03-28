import api, { buildUrl, request } from "@/lib/api";

export const apiClient = api;

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  return request(path, {
    method: options.method,
    headers: options.headers as Record<string, string> | undefined,
    data: isForm
      ? options.body
      : typeof options.body === "string"
        ? JSON.parse(options.body)
        : options.body,
  }) as Promise<T>;
}

const buildMethodOptions = (
  method: string,
  data?: unknown,
  headers?: Record<string, string>
) => ({
  method,
  headers,
  data,
});

const client = {
  interceptors: api.interceptors,
  async request<T = unknown>(config: any): Promise<{ data: T; status: number; headers: Headers }> {
    const res = await api.request<T>(config);
    const { data, status, headers } = res;
    return { data, status, headers: new Headers(headers as HeadersInit) };
  },
  async get<T = unknown>(url: string): Promise<{ data: T; status: number }> {
    const res = await api.get<T>(url);
    const { data, status } = res;
    return { data, status };
  },
  async post<T = unknown>(url: string, data?: unknown, config?: any): Promise<{ data: T; status: number }> {
    const res = await api.post<T>(url, data, config);
    const { data, status } = res;
    return { data, status };
  },
  async patch<T = unknown>(url: string, data?: unknown, config?: any): Promise<{ data: T; status: number }> {
    const res = await api.patch<T>(url, data, config);
    const { data, status } = res;
    return { data, status };
  },
  async put<T = unknown>(url: string, data?: unknown, config?: any): Promise<{ data: T; status: number }> {
    const res = await api.put<T>(url, data, config);
    const { data, status } = res;
    return { data, status };
  },
  async delete<T = unknown>(url: string): Promise<{ data: T; status: number }> {
    const res = await api.delete<T>(url);
    const { data, status } = res;
    return { data, status };
  },
};

export function buildApiUrl(path: string): string {
  return buildUrl(path);
}

export default client;
