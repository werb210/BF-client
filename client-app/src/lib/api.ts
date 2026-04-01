if (import.meta.env.MODE !== "test" && !import.meta.env.VITE_API_URL) {
  throw new Error("VITE_API_URL_NOT_DEFINED");
}

const base = import.meta.env.VITE_API_URL;

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

type ApiEnvelope<T> = {
  status?: "ok" | "error" | string;
  data?: T;
  error?: {
    message?: string;
  } | string;
};

function resolveErrorMessage(error: ApiEnvelope<unknown>["error"]): string {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object" && typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message;
  }

  return "API_ERROR";
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}${path}`, opts);

  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("INVALID_JSON_RESPONSE");
  }

  if (!json || typeof json !== "object") {
    throw new Error("INVALID_API_SHAPE");
  }

  if (!("status" in json)) {
    throw new Error("MISSING_STATUS_FIELD");
  }

  if (json.status === "error") {
    throw new Error(resolveErrorMessage(json.error));
  }

  if (json.status !== "ok") {
    throw new Error("UNKNOWN_STATUS");
  }

  return json.data as T;
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

export async function apiAuth<T = unknown>(path: string, token: string | null | undefined, options: ApiRequestOptions = {}) {
  if (!token) {
    throw new Error("MISSING_AUTH_TOKEN");
  }

  return apiCall<T>(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export type ApiResponse<T> = T;
