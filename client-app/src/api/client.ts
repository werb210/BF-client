import { AxiosHeaders, type AxiosRequestConfig } from "axios";
import { getToken } from "@/lib/auth";
import { createHttpClient } from "./httpClient";
import { API_ENDPOINTS } from "./endpoints";
import { API_BASE, buildUrl } from "@/config/api";

const api = createHttpClient({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers || {});
  const token = getToken();
  const requestUrl = String(config.url || "");
  const isOtpRequest =
    requestUrl.includes(API_ENDPOINTS.OTP_START) ||
    requestUrl.includes(API_ENDPOINTS.OTP_VERIFY);

  headers.delete("X-Request-Id");
  headers.delete("x-request-id");
  headers.delete("X-Client-Id");
  headers.delete("x-client-id");

  if (isOtpRequest || !token) {
    headers.delete("Authorization");
  } else {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const method = String(config.method || "get").toLowerCase();
  const hasBody = method !== "get" && method !== "head";
  if (!hasBody && !headers.has("Content-Type")) {
    headers.delete("Content-Type");
  }
  config.headers = headers;

  return config;
});

export const apiClient = api;

function normalizePath(url: string): string {
  if (!url) return "/";
  if (/^https?:\/\//.test(url)) return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return normalized.startsWith("/api/") ? normalized.slice(4) : normalized;
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return buildUrl(normalizePath(path));
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
  });

  return response.data;
}

export default api;
