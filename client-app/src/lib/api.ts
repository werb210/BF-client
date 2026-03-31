import { getTokenOrFail } from "@/services/token"

type ApiRequestConfig = {
  url?: string
  method?: string
  headers?: HeadersInit | Record<string, string>
  data?: any
  signal?: AbortSignal
  onUploadProgress?: (event: unknown) => void
  [key: string]: unknown
}

type ApiResponse<T = any> = {
  data: T
  status: number
  headers: Headers
}

function assertApiPath(path: string): string {
  if (!path.startsWith("/api/")) {
    throw new Error("[INVALID API FORMAT]")
  }

  return path
}

function stringifyData(data: ApiRequestConfig["data"]): BodyInit | undefined {
  if (data == null) return undefined
  if (typeof data === "string" || data instanceof FormData || data instanceof Blob || data instanceof URLSearchParams) {
    return data
  }
  return JSON.stringify(data)
}

export async function apiRequest<T = any>(path: string, options: any = {}): Promise<T> {
  const normalizedPath = assertApiPath(path)
  const token = getTokenOrFail()

  const headers = {
    ...(options.headers || {}),
  } as Record<string, string>

  delete headers.Authorization
  delete headers.authorization

  headers.Authorization = `Bearer ${token}`
  headers["Content-Type"] = "application/json"

  const res = await fetch(normalizedPath, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    localStorage.removeItem("token")
    window.location.href = "/login"
    throw new Error("[AUTH FAIL]")
  }

  if (!res.ok) {
    throw new Error(`[API ERROR] ${res.status}`)
  }

  const text = await res.text()

  if (!text) {
    throw new Error("[EMPTY RESPONSE]")
  }

  return JSON.parse(text) as T
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path.startsWith("/api/") ? path : `/api${path}`, options)
}

export function setToken(nextToken: string) {
  localStorage.setItem("token", nextToken)
}

export function loadToken() {
  return localStorage.getItem("token")
}

export function clearToken() {
  localStorage.removeItem("token")
}

async function send<T = any>(method: string, path: string, data?: ApiRequestConfig["data"], init?: any) {
  const body = stringifyData(data)
  const payload = await apiRequest<T>(path.startsWith("/api/") ? path : `/api${path}`, {
    ...init,
    method,
    body,
  })

  return {
    data: payload,
    status: 200,
    headers: new Headers(),
  } as ApiResponse<T>
}

export const api = {
  request: async <T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> => {
    if (!config.url) {
      throw new Error("[INVALID API PATH]")
    }

    const { url, method, data, ...rest } = config
    return send<T>(method || "GET", url, data, {
      headers: config.headers,
      ...rest,
    })
  },
  get: async <T = any>(url: string, init?: any) => send<T>("GET", url, undefined, init),
  post: async <T = any>(url: string, data?: ApiRequestConfig["data"], init?: any) =>
    send<T>("POST", url, data, init),
  put: async <T = any>(url: string, data?: ApiRequestConfig["data"], init?: any) =>
    send<T>("PUT", url, data, init),
  patch: async <T = any>(url: string, data?: ApiRequestConfig["data"], init?: any) =>
    send<T>("PATCH", url, data, init),
  delete: async <T = any>(url: string, init?: any) => send<T>("DELETE", url, undefined, init),
}

export function requireAuth(): string {
  return getTokenOrFail()
}

export function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, options)
}

export function buildUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("[INVALID API PATH]")
  }

  return path.startsWith("/api/") ? path : `/api${path}`
}

export default api
export type { ApiResponse }
