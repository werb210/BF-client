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

let token: string | null = null

export function setToken(nextToken: string | null) {
  token = nextToken
}

export function getToken() {
  return token
}

export function loadToken() {
  return getToken()
}

export function clearToken() {
  setToken(null)
}

function validatePath(path: string) {
  if (!path.startsWith("/api/")) {
    throw new Error("INVALID_API_PATH")
  }

  if (path.includes("..") || path.includes("//")) {
    throw new Error("MALFORMED_PATH")
  }
}

function stringifyData(data: ApiRequestConfig["data"]): BodyInit | undefined {
  if (data == null) return undefined
  if (typeof data === "string" || data instanceof FormData || data instanceof Blob || data instanceof URLSearchParams) {
    return data
  }
  return JSON.stringify(data)
}

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  validatePath(path)

  const outgoingHeaders = new Headers(options.headers ?? {})
  outgoingHeaders.delete("Authorization")
  outgoingHeaders.delete("authorization")
  const headers: Record<string, string> = {}

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = outgoingHeaders.get("Content-Type") ?? "application/json"
  }

  if (!path.startsWith("/api/public/")) {
    if (!token) {
      throw new Error("AUTH_REQUIRED")
    }
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(path, {
    ...options,
    headers: {
      ...Object.fromEntries(outgoingHeaders.entries()),
      ...headers,
    },
  })

  if (res.status === 401) {
    token = null
    throw new Error("UNAUTHORIZED")
  }

  if (res.status === 204) {
    return null as T
  }

  if (!res.ok) {
    throw new Error("API_ERROR")
  }

  return (await res.json()) as T
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path.startsWith("/api/") ? path : `/api${path}`, options)
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
  if (!token) {
    throw new Error("AUTH_REQUIRED")
  }
  return token
}

export function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
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
