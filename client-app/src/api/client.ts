import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { ApiEndpoint } from "./endpoints";
import { API_BASE } from "@/config/apiBase";
import { getToken } from "@/auth/tokenStorage";

const API_ROOT = `${API_BASE}/api`.replace(/\/$/, "");

export const apiClient = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

function normalizePath(url: string | ApiEndpoint): string {
  if (!url) return "/";
  if (/^https?:\/\//.test(url)) return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return normalized.replace(/^\/api(?=\/|$)/, "") || "/";
}

function toAxiosConfig(options: RequestInit = {}): AxiosRequestConfig {
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

  return {
    method,
    data,
    headers: options.headers as AxiosRequestConfig["headers"],
    withCredentials: options.credentials === "include" ? true : undefined,
  };
}

export function buildApiUrl(path: string | ApiEndpoint): string {
  const pathPart = normalizePath(path);

  if (/^https?:\/\//.test(pathPart)) {
    return pathPart;
  }

  return `${API_ROOT}${pathPart}`;
}

export async function apiRequest<T = unknown>(path: string | ApiEndpoint, options: RequestInit = {}): Promise<T> {
  try {
    const response = await apiClient.request<T>({
      url: normalizePath(path),
      ...toAxiosConfig(options),
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<T>;
    if (axiosError.response?.data) {
      return axiosError.response.data;
    }
    return {} as T;
  }
}

export const get = <T = unknown>(url: string | ApiEndpoint, config?: AxiosRequestConfig) =>
  apiClient.get<T>(normalizePath(url), config);
export const post = <T = unknown>(url: string | ApiEndpoint, data?: unknown, config?: AxiosRequestConfig) =>
  apiClient.post<T>(normalizePath(url), data, config);
export const put = <T = unknown>(url: string | ApiEndpoint, data?: unknown, config?: AxiosRequestConfig) =>
  apiClient.put<T>(normalizePath(url), data, config);
export const patch = <T = unknown>(url: string | ApiEndpoint, data?: unknown, config?: AxiosRequestConfig) =>
  apiClient.patch<T>(normalizePath(url), data, config);
export const del = <T = unknown>(url: string | ApiEndpoint, config?: AxiosRequestConfig) =>
  apiClient.delete<T>(normalizePath(url), config);

const api = {
  get,
  post,
  put,
  patch,
  delete: del,
  request: <T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    apiClient.request<T>({ ...config, url: normalizePath(config.url || "") }),
};

export default api;
