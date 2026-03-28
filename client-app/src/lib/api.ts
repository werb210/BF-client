import axios, { AxiosRequestConfig } from "axios";

const API_BASE = import.meta.env.VITE_API_URL

if (!API_BASE) {
  throw new Error('VITE_API_URL is not defined')
}

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
  const token = localStorage.getItem('token')

  const res = await axios({
    url: `${API_BASE}${url}`,
    method: config.method || 'GET',
    data: config.data,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...config.headers,
    },
  })

  return res.data
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
