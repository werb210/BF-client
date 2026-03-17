import { type AxiosRequestConfig } from "axios";
import { createHttpClient } from "./httpClient";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.staff.boreal.financial/api";

const api = createHttpClient({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const apiClient = api;

function normalizePath(url: string): string {
  if (!url) return "/";
  if (/^https?:\/\//.test(url)) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

export function buildApiUrl(path: string): string {
  const normalized = normalizePath(path);
  if (/^https?:\/\//.test(normalized)) return normalized;
  return `${api.defaults.baseURL}${normalized}`;
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
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

export default api;
