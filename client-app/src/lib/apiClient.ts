import { clearToken as clearStoredToken, getToken as getStoredToken, setToken as setStoredToken } from "@/auth/token"

type ApiRequestConfig = {
  url?: string
  method?: string
  headers?: HeadersInit | Record<string, string>
  data?: unknown
  signal?: AbortSignal
  onUploadProgress?: (event: unknown) => void
  [key: string]: unknown
}

type ApiResponse<T = unknown> = {
  data: T
  status: number
  headers: Headers
}

export function setToken(nextToken: string | null) {
  if (!nextToken) {
    clearStoredToken()
    return
  }
  setStoredToken(nextToken)
}

export function getToken() {
  return getStoredToken()
}

export function loadToken() {
  return getStoredToken()
}

export function clearToken() {
  clearStoredToken()
}

const DEFAULT_TIMEOUT = 10000
const PUBLIC_PREFIXES = ["/api/auth", "/api/public", "/health"]

function isPublicPath(url: string) {
  try {
    const u = new URL(url, window.location.origin)
    return PUBLIC_PREFIXES.some((p) => u.pathname.startsWith(p))
  } catch {
    return PUBLIC_PREFIXES.some((p) => url.startsWith(p))
  }
}

function validatePath(path: string) {
  if (!path.startsWith("/api/")) {
    throw new Error("INVALID_API_PATH")
  }

  if (path.includes("..") || path.includes("//")) {
    throw new Error("MALFORMED_PATH")
  }
}

function createRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function stringifyData(data: ApiRequestConfig["data"]): BodyInit | undefined {
  if (data == null) return undefined
  if (typeof data === "string" || data instanceof FormData || data instanceof Blob || data instanceof URLSearchParams) {
    return data
  }
  return JSON.stringify(data)
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number) {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(/* apiRequest */ url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timerId)
  }
}

async function retry(fn: () => Promise<Response>, retries = 2) {
  let attempt = 0

  while (attempt <= retries) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === retries) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
      attempt += 1
    }
  }

  throw new Error("UNREACHABLE")
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  validatePath(path)

  const outgoingHeaders = new Headers(options.headers ?? {})
  outgoingHeaders.delete("Authorization")
  outgoingHeaders.delete("authorization")

  const headers: Record<string, string> = {
    ...Object.fromEntries(outgoingHeaders.entries()),
    "Content-Type": outgoingHeaders.get("Content-Type") ?? "application/json",
    "X-Request-Id": createRequestId(),
  }

  if (options.body instanceof FormData) {
    delete headers["Content-Type"]
  }

  if (!isPublicPath(path)) {
    const token = getStoredToken()
    if (!token) {
      throw new Error("AUTH_REQUIRED")
    }
    headers.Authorization = `Bearer ${token}`
  }

  const res = await retry(() =>
    fetchWithTimeout(
      path,
      {
        ...options,
        headers,
      },
      DEFAULT_TIMEOUT,
    ),
  )

  if (res.status === 401) {
    clearStoredToken()
    throw new Error("INVALID_TOKEN")
  }

  if (res.status === 204) {
    return null as T
  }

  let data: any = {}
  try {
    data = await res.json()
  } catch {}

  if (!res.ok) {
    throw new Error(data?.error || "REQUEST_FAILED")
  }

  return data as T
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path.startsWith("/api/") ? path : `/api${path}`, options)
}

async function send<T = unknown>(method: string, path: string, data?: ApiRequestConfig["data"], init?: RequestInit) {
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
  request: async <T = unknown>(config: ApiRequestConfig): Promise<ApiResponse<T>> => {
    if (!config.url) {
      throw new Error("[INVALID API PATH]")
    }

    const { url, method, data, ...rest } = config
    return send<T>(method || "GET", url, data, {
      headers: config.headers,
      ...rest,
    })
  },
  get: async <T = unknown>(url: string, init?: RequestInit) => send<T>("GET", url, undefined, init),
  post: async <T = unknown>(url: string, data?: ApiRequestConfig["data"], init?: RequestInit) => send<T>("POST", url, data, init),
  put: async <T = unknown>(url: string, data?: ApiRequestConfig["data"], init?: RequestInit) => send<T>("PUT", url, data, init),
  patch: async <T = unknown>(url: string, data?: ApiRequestConfig["data"], init?: RequestInit) => send<T>("PATCH", url, data, init),
  delete: async <T = unknown>(url: string, init?: RequestInit) => send<T>("DELETE", url, undefined, init),
}

export function requireAuth(): string {
  const token = getStoredToken()
  if (!token) {
    throw new Error("AUTH_REQUIRED")
  }
  return token
}

export function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, options)
}

export function buildUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("INVALID_API_PATH")
  }

  return path.startsWith("/api/") ? path : `/api${path}`
}

export default api
export type { ApiResponse }
