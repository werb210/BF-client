import axios, { AxiosRequestConfig } from "axios";

/**
 * Single axios instance used everywhere
 * MUST use VITE_API_URL for SWA
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
});

/**
 * Central request wrapper (required by contract guards)
 */
export async function apiRequest<T = unknown>(
  configOrUrl: AxiosRequestConfig | string,
  maybeConfig?: AxiosRequestConfig
): Promise<T> {
  const config =
    typeof configOrUrl === "string"
      ? ({ ...(maybeConfig || {}), url: configOrUrl } as AxiosRequestConfig)
      : configOrUrl;

  const response = await api.request<T>(config);
  return response.data;
}

/**
 * Required by App.tsx
 */
export function requireAuth(): string {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login";
    throw new Error("Not authenticated");
  }

  return token;
}

export function request<T = unknown>(
  path: string,
  options: AxiosRequestConfig = {}
): Promise<T> {
  return apiRequest<T>({ ...options, url: path });
}

export function buildUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}${path}`;
}

export { api };
export default api;
