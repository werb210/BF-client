export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const BASE_URL = import.meta.env.VITE_API_URL || ""

function buildUrl(path: string) {
  if (!path.startsWith("/api/")) {
    throw new Error(`Invalid API path: ${path}`)
  }
  return `${BASE_URL}${path}`
}

async function parseApiResponse<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json()

  if (!json.success) {
    throw new Error((json as { success: false; error: string }).error)
  }

  return (json as { success: true; data: T }).data
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  console.log("API CALL:", path, body)
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  })

  return parseApiResponse<T>(res)
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  console.log("API CALL:", path, formData)
  const res = await fetch(buildUrl(path), {
    method: "POST",
    body: formData
  })

  return parseApiResponse<T>(res)
}

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown }

export async function apiCall<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase()

  if (method === "POST") {
    if (options.body instanceof FormData) {
      return apiUpload<T>(path, options.body)
    }

    if (typeof options.body === "string") {
      return apiPost<T>(path, options.body ? JSON.parse(options.body) : undefined)
    }

    return apiPost<T>(path, options.body)
  }

  console.log("API CALL:", path, options.body)
  const res = await fetch(buildUrl(path), {
    ...options,
    method,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body as BodyInit | null | undefined
  })

  return parseApiResponse<T>(res)
}
