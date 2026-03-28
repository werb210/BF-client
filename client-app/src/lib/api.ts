import axios, { type AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/api";
import { getToken } from "@/lib/auth";

type ApiRequestOptions = RequestInit & {
  data?: unknown;
  params?: Record<string, unknown>;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    const headers = (config.headers || {}) as Record<string, string>;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers as any;
  }
  return config;
});

function normalizeBody(body: BodyInit | null | undefined): unknown {
  if (body == null) return undefined;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

export const request = async (path: string, options: ApiRequestOptions = {}) => {
  const config: AxiosRequestConfig = {
    url: path,
    method: options.method,
    headers: options.headers as Record<string, string> | undefined,
    params: options.params,
    data: options.data ?? normalizeBody(options.body),
    withCredentials: options.credentials === "omit" ? false : true,
  };

  const response = await api.request(config);
  return response.data;
};

export const apiRequest = <T = unknown>(path: string, options: ApiRequestOptions = {}) =>
  request(path, options) as Promise<T>;

export const buildUrl = (path: string): string => `${API_BASE_URL}${path}`;

export default api;
