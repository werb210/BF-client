const base = import.meta.env.VITE_API_URL;

if (import.meta.env.MODE !== "test" && !base) {
  throw new Error("VITE_API_URL is required at runtime");
}

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

type ApiEnvelope<T> = {
  status: "ok" | "error";
  data?: T;
  error?: string;
};

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}${path}`, opts);
  const json = (await res.json()) as ApiEnvelope<T>;

  if (!res.ok) {
    throw new Error(json.error ?? `API error ${res.status}`);
  }

  if (json.status === "error") {
    throw new Error(json.error ?? "Unknown API error");
  }

  return (json.data ?? ({} as T)) as T;
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}) {
  return api<T>(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
}

export async function apiCall<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const body =
    isFormData || typeof options.body === "string"
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined;

  const headers = isFormData ? options.headers : { "Content-Type": "application/json", ...options.headers };

  return api<T>(path, {
    ...options,
    headers,
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
  });
}

export type ApiResponse<T> = T;
