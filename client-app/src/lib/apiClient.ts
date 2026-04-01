import { clearToken, getToken } from "@/auth/token"

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const BASE_URL = import.meta.env.VITE_API_URL || ""

function buildUrl(path: string) {
  if (!path.startsWith("/api/")) {
    throw new Error(`Invalid API path: ${path}`)
  }
  if (import.meta.env.MODE === "test") {
    return path
  }

  return `${BASE_URL}${path}`
}

async function parseApiResponse(res: Response) {
  let data: any = null

  try {
    data = await res.json()
  } catch {
    data = null
  }

  return data
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body,
  })
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body: formData,
  })
}

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown }

export async function apiCall<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase()
  const token = getToken()

  if (path.startsWith("/api/private") && !token) {
    throw new Error("AUTH_REQUIRED")
  }

  const isFormData = options.body instanceof FormData
  const hasStringBody = typeof options.body === "string"

  const res = await fetch(buildUrl(path), {
    ...options,
    method,
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isFormData
      ? options.body
      : hasStringBody
        ? (options.body as string)
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  })

  if (!res.ok) {
    if (res.status === 401) {
      clearToken()

      throw new Error("INVALID_TOKEN")
    }

    throw new Error("HTTP_ERROR")
  }

  const json = await parseApiResponse(res)

  if (json && json.success === false) {
    throw new Error(json.error || "API_ERROR")
  }

  if (json && json.success === true && Object.prototype.hasOwnProperty.call(json, "data")) {
    return json.data as T
  }

  return (json ?? { ok: true }) as T
}
