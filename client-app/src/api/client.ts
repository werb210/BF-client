import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { ApiEndpoint } from "./endpoints";

function normalizePath(url: string | ApiEndpoint): string {
  if (!url) return "/";
  if (/^https?:\/\//.test(url)) return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return normalized.replace(/^\/api(?=\/|$)/, "") || "/";
}

export const api = axios.create({
  baseURL: "https://server.boreal.financial/api",
  timeout: 20000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (token) {
    config.headers = {
      ...(config.headers as Record<string, unknown>),
      Authorization: `Bearer ${token}`,
    } as any;
  }

  if (config.url) {
    config.url = normalizePath(config.url as string);
  }

  return config;
});

export const apiClient = api;

export function buildApiUrl(path: string | ApiEndpoint): string {
  const pathPart = normalizePath(path);

  if (/^https?:\/\//.test(pathPart)) {
    return pathPart;
  }

  return `${api.defaults.baseURL}${pathPart}`;
}

export async function apiRequest<T = unknown>(path: string | ApiEndpoint, options: RequestInit = {}): Promise<T> {
  const method = options.method || "GET";
  const body = options.body;
  let data: unknown = body;

  if (typeof body === "string") {
    try {
      data = JSON.parse(body);
    } catch {
      data = body;
    }
  }

  const response = await api.request<T>({
    url: normalizePath(path),
    method,
    data,
    headers: options.headers as AxiosRequestConfig["headers"],
    withCredentials: options.credentials === "include" ? true : undefined,
  });

  return response.data;
}

export const get = <T = unknown>(url: string | ApiEndpoint, config?: AxiosRequestConfig) =>
  api.get<T>(normalizePath(url), config);
export const post = <T = unknown>(url: string | ApiEndpoint, data?: unknown, config?: AxiosRequestConfig) =>
  api.post<T>(normalizePath(url), data, config);
export const put = <T = unknown>(url: string | ApiEndpoint, data?: unknown, config?: AxiosRequestConfig) =>
  api.put<T>(normalizePath(url), data, config);
export const patch = <T = unknown>(url: string | ApiEndpoint, data?: unknown, config?: AxiosRequestConfig) =>
  api.patch<T>(normalizePath(url), data, config);
export const del = <T = unknown>(url: string | ApiEndpoint, config?: AxiosRequestConfig) =>
  api.delete<T>(normalizePath(url), config);

const apiDefault = {
  get,
  post,
  put,
  patch,
  delete: del,
  request: <T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.request<T>({ ...config, url: normalizePath(config.url || "") }),
};

export default apiDefault;
