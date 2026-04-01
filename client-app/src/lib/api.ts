const API_BASE = import.meta.env.VITE_API_URL ?? "";

if (import.meta.env.MODE !== "test" && !API_BASE) {
  throw new Error("VITE_API_URL is required");
}

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function apiCall<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const body =
    isFormData || typeof options.body === "string"
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined;

  return apiRequest<T>(path, {
    ...options,
    body,
  });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body,
  });
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body: formData,
    headers: {},
  });
}

export type ApiResponse<T> = T;
