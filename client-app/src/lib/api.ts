import { getToken } from "@/auth/token";

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
  };
};

const normalize = (baseUrl: string, path: string) => `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

function requiresAuth(path: string): boolean {
  return !path.startsWith("/auth") && !path.startsWith("auth") && !path.startsWith("/health") && !path.startsWith("health");
}

export async function api(path: string, options: RequestInit = {}): Promise<unknown> {
  const requestOptions: RequestInit = {
    ...options,
    headers: { ...(options.headers ?? {}) },
  };

  if (requiresAuth(path)) {
    const token = getToken();

    if (!token) {
      throw new Error("MISSING_AUTH_TOKEN");
    }

    requestOptions.headers = {
      ...requestOptions.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  const res = await fetch(normalize(base, path), requestOptions);

  if (!res.ok) {
    throw new Error(`HTTP_${res.status}`);
  }

  let json: ApiEnvelope<unknown>;

  try {
    json = (await res.json()) as ApiEnvelope<unknown>;
  } catch {
    throw new Error("INVALID_JSON_RESPONSE");
  }

  if (!json || typeof json !== "object") {
    throw new Error("INVALID_API_SHAPE");
  }

  if (!Object.prototype.hasOwnProperty.call(json, "status")) {
    throw new Error("MISSING_STATUS_FIELD");
  }

  if (json.status === "error") {
    if (!json.error || !json.error.message) {
      throw new Error("MALFORMED_ERROR_RESPONSE");
    }

    throw new Error(json.error.message);
  }

  if (json.status !== "ok") {
    throw new Error("UNKNOWN_STATUS");
  }

  if (!Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new Error("MISSING_DATA_FIELD");
  }

  return json.data;
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}) {
  const data = await api(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  return data as T;
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

  const data = await api(path, {
    ...options,
    headers,
    body,
  });

  return data as T;
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
