import axios, { AxiosRequestConfig } from "axios";

// FORCE correct base (NO /api prefix)
const API_BASE = import.meta.env.VITE_API_URL || "https://server.boreal.financial";
let redirected = false;

/**
 * Single axios instance used everywhere
 * MUST use VITE_API_URL for SWA
 */
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

/**
 * Central request wrapper (required by contract guards)
 */
export async function apiRequest<T = any>(
  url: string,
  config: AxiosRequestConfig & { data?: any } = {}
): Promise<T> {
  const token = localStorage.getItem("token");

  try {
    const res = await axios({
      url: `${API_BASE}${url}`,
      method: config.method || "GET",
      data: config.data,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...config.headers,
      },
      ...config,
    });

    return res.data;
  } catch (error: any) {
    if (error?.response?.status === 401) {
      if (!redirected) {
        redirected = true;
        window.location.replace("/login");
      }
      throw new Error("AUTH_REQUIRED");
    }

    throw new Error("API_ERROR");
  }
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
  return apiRequest<T>(path, options as AxiosRequestConfig & { data?: any });
}

export function buildUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export { api };
export default api;
