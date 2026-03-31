import axios, { AxiosHeaders, type AxiosRequestConfig, type AxiosResponse, type Method } from "axios";
import { API_BASE_URL } from "@/config/api";
import { getTokenOrFail } from "@/services/token";

const TOKEN_KEY = "token";
let token: string | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

function getStoredToken(): string | null {
  if (token) return token;
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const requestUrl = config.url || "";
  const isOtpAuthRequest = requestUrl.includes("/api/auth/otp/start") || requestUrl.includes("/api/auth/otp/verify");

  if (!isOtpAuthRequest) {
    const currentToken = getTokenOrFail();
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${currentToken}`);
    config.headers = headers;
  }

  // eslint-disable-next-line no-console
  console.log("[REQ]", config.method?.toUpperCase(), config.url);
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // eslint-disable-next-line no-console
    console.error("[API ERROR]", err.response?.status, err.response?.data);
    if (err.response?.status === 401) {
      // eslint-disable-next-line no-console
      console.error("[AUTH FAILURE] TOKEN REJECTED");
      localStorage.removeItem(TOKEN_KEY);
      token = null;
    }
    return Promise.reject(err);
  }
);

export function setToken(nextToken: string) {
  token = nextToken;
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(TOKEN_KEY, nextToken);
}

export function loadToken() {
  if (typeof localStorage === "undefined") return;
  token = localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  token = null;
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const method = (options.method || "GET") as Method;
  const config: AxiosRequestConfig = {
    url: path,
    method,
    headers: options.headers as AxiosRequestConfig["headers"],
    data: options.body,
  };

  const response = await api.request(config);
  return response.data;
}

function parseRequestBody(body: RequestInit["body"]): unknown {
  if (body == null) return undefined;

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  return body;
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET") as Method;
  const response = await api.request<T>({
    url: path,
    method,
    headers: options.headers as AxiosRequestConfig["headers"],
    data: parseRequestBody(options.body),
  });

  return response.data;
}

export function requireAuth(): string {
  return getTokenOrFail();
}

export function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, options);
}

export function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

export default api;
export type ApiResponse<T = unknown> = AxiosResponse<T>;
