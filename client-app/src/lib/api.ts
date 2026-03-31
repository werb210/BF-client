import axios, { AxiosHeaders, type AxiosRequestConfig, type AxiosResponse, type Method } from "axios"
import { getTokenOrFail } from "@/services/token"

const TOKEN_KEY = "token"

export const api = axios.create({
  baseURL: "/api",
  timeout: 20000,
})

function assertRelativeApiUrl(url: string | undefined): string {
  if (!url || !url.startsWith("/")) {
    throw new Error(`[API BLOCK] INVALID URL: ${url}`)
  }

  if (/^https?:\/\//i.test(url)) {
    throw new Error(`[API BLOCK] ABSOLUTE URL FORBIDDEN: ${url}`)
  }

  return url
}

function normalizeApiPath(url: string): string {
  if (url === "/api") return "/"
  if (url.startsWith("/api/")) {
    return url.replace(/^\/api/, "")
  }
  return url
}

function canBypassToken(url: string): boolean {
  return url === "/auth/otp/start" || url === "/auth/otp/verify"
}

api.interceptors.request.use((config) => {
  const requestUrl = normalizeApiPath(assertRelativeApiUrl(config.url))
  config.url = requestUrl

  const headers = AxiosHeaders.from(config.headers)
  headers.delete("Authorization")

  if (!canBypassToken(requestUrl)) {
    const token = getTokenOrFail()
    headers.set("Authorization", `Bearer ${token}`)
  }

  config.headers = headers

  // eslint-disable-next-line no-console
  console.log("[REQ]", config.method?.toUpperCase(), config.url)

  return config
})

api.interceptors.response.use(
  (res) => {
    // eslint-disable-next-line no-console
    console.log("[STATUS]", res.status)
    return res
  },
  (err) => {
    if (err.response?.status === 401) {
      // eslint-disable-next-line no-console
      console.error("[AUTH FAIL] TOKEN INVALID")
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = "/login"
    }

    throw err
  }
)

export function setToken(nextToken: string) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(TOKEN_KEY, nextToken)
}

export function loadToken() {
  return
}

export function clearToken() {
  if (typeof localStorage === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
}

function parseRequestBody(body: RequestInit["body"]): unknown {
  if (body == null) return undefined

  if (typeof body === "string") {
    try {
      return JSON.parse(body)
    } catch {
      return body
    }
  }

  return body
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const method = (options.method || "GET") as Method
  const config: AxiosRequestConfig = {
    url: path,
    method,
    headers: options.headers as AxiosRequestConfig["headers"],
    data: parseRequestBody(options.body),
  }

  const response = await api.request(config)
  return response.data
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET") as Method
  const response = await api.request<T>({
    url: path,
    method,
    headers: options.headers as AxiosRequestConfig["headers"],
    data: parseRequestBody(options.body),
  })

  return response.data
}

export function requireAuth(): string {
  return getTokenOrFail()
}

export function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, options)
}

export function buildUrl(path: string): string {
  return normalizeApiPath(assertRelativeApiUrl(path))
}

export default api
export type ApiResponse<T = unknown> = AxiosResponse<T>
