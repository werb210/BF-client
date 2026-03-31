import { getToken as loadToken, clearToken as clearStoredToken, setToken as storeToken } from "@/auth/token"

const PUBLIC_PREFIXES = ["/api/auth", "/api/public", "/health"]
const DEFAULT_TIMEOUT = 10000

function isPublic(url: string) {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost"
    const u = new URL(url, origin)
    return PUBLIC_PREFIXES.some(p => u.pathname.startsWith(p))
  } catch {
    return PUBLIC_PREFIXES.some(p => url.startsWith(p))
  }
}

function validatePath(path: string) {
  if (!path.startsWith("/api/") && !path.startsWith("/health")) {
    throw new Error("INVALID_API_PATH")
  }

  if (path.includes("..") || path.includes("//")) {
    throw new Error("MALFORMED_PATH")
  }
}

function createRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number) {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, {
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
      if (attempt === retries) throw error
      await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)))
      attempt += 1
    }
  }
  throw new Error("UNREACHABLE")
}

export function setToken(nextToken: string | null) {
  if (!nextToken) {
    clearStoredToken()
    return
  }
  storeToken(nextToken)
}

export function getToken() {
  return loadToken()
}

export function clearToken() {
  clearStoredToken()
}

export async function apiRequest<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  validatePath(url)

  const token = loadToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  }

  delete headers.Authorization
  delete headers.authorization

  headers["X-Request-Id"] = createRequestId()

  if (options.body instanceof FormData) {
    delete headers["Content-Type"]
  }

  if (!isPublic(url)) {
    if (!token) throw new Error("AUTH_REQUIRED")
    headers.Authorization = `Bearer ${token}`
  }

  const res = await retry(() => fetchWithTimeout(url, { ...options, headers }, DEFAULT_TIMEOUT))

  if (res.status === 401) {
    clearStoredToken()
    throw new Error("INVALID_TOKEN")
  }

  if (res.status === 204) {
    return null
  }

  let data: any = {}
  try {
    data = await res.json()
  } catch {}

  if (!res.ok) {
    if (data?.error) throw new Error(data.error)
    throw new Error("REQUEST_FAILED")
  }

  return data as T
}

type ApiRequestConfig = {
  url?: string
  method?: string
  headers?: HeadersInit | Record<string, string>
  data?: unknown
  [key: string]: unknown
}

type ApiResponse<T = unknown> = {
  data: T
  status: number
  headers: Headers
}

function stringifyData(data: unknown): BodyInit | undefined {
  if (data == null) return undefined
  if (typeof data === "string" || data instanceof FormData || data instanceof Blob || data instanceof URLSearchParams) {
    return data
  }
  return JSON.stringify(data)
}

async function send<T = unknown>(method: string, path: string, data?: unknown, init?: RequestInit) {
  const body = stringifyData(data)
  const payload = await apiRequest<T>(path.startsWith("/api/") ? path : `/api${path}`, {
    ...init,
    method,
    body,
  })

  return { data: payload, status: 200, headers: new Headers() } as ApiResponse<T>
}

export const api = {
  request: async <T = unknown>(config: ApiRequestConfig): Promise<ApiResponse<T>> => {
    if (!config.url) throw new Error("[INVALID API PATH]")
    const { url, method, data, ...rest } = config
    return send<T>(method || "GET", url, data, {
      headers: config.headers,
      ...(rest as RequestInit),
    })
  },
  get: async <T = unknown>(url: string, init?: RequestInit) => send<T>("GET", url, undefined, init),
  post: async <T = unknown>(url: string, data?: unknown, init?: RequestInit) => send<T>("POST", url, data, init),
  put: async <T = unknown>(url: string, data?: unknown, init?: RequestInit) => send<T>("PUT", url, data, init),
  patch: async <T = unknown>(url: string, data?: unknown, init?: RequestInit) => send<T>("PATCH", url, data, init),
  delete: async <T = unknown>(url: string, init?: RequestInit) => send<T>("DELETE", url, undefined, init),
}

export default api

export function buildUrl(path: string): string {
  if (!path.startsWith("/")) throw new Error("INVALID_API_PATH")
  return path.startsWith("/api/") ? path : `/api${path}`
}
