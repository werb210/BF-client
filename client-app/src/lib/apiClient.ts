import { clearToken, getToken } from "@/auth/token"

export const API_BASE = import.meta.env.VITE_API_URL

if (!API_BASE) {
  throw new Error("Missing VITE_API_URL")
}

function buildUrl(path: string) {
  if (import.meta.env.MODE === "test") {
    return path
  }

  return `${API_BASE}${path}`
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}) {
  const token = getToken()

  if (path.startsWith("/api/private") && !token) {
    throw new Error("AUTH_REQUIRED")
  }

  const isFormData = options.body instanceof FormData

  const res = await fetch(buildUrl(path), {
    ...options,
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    if (res.status === 401) {
      clearToken()
      throw new Error("INVALID_TOKEN")
    }

    const text = await res.text()
    console.error("API_ERROR", {
      path,
      status: res.status,
      body: text,
    })

    throw new Error(`API request failed: ${res.status}`)
  }

  return (await res.json()) as T
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: typeof body === "string" || body instanceof FormData ? body : JSON.stringify(body),
  })
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: formData,
  })
}

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown }

export async function apiCall<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData
  const body =
    isFormData || typeof options.body === "string"
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined

  return apiRequest<T>(path, {
    ...options,
    body,
  })
}
