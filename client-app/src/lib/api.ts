import { getToken } from "@/auth/token";
import { getEnv } from "@/config/env";

type ApiEnvelope<T = unknown> = {
  status: "ok" | "error" | "not_ready";
  data?: T;
  error?: string;
};

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

function requiresAuth(path: string): boolean {
  return !path.includes("/auth/") && !path.includes("/health");
}

function toRequestBody(body: unknown): BodyInit | null | undefined {
  if (body == null) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const { VITE_API_URL } = getEnv();
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${VITE_API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("bf_access_token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const json = (await res.json()) as ApiEnvelope<T>;

  if (!json || typeof json !== "object" || !("status" in json)) {
    throw new Error("Invalid API response");
  }

  if (json.status !== "ok") {
    throw new Error(json.error || "API error");
  }

  return json.data as T;
}

export async function apiCall<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const requestOptions: RequestInit = {
    ...options,
    body: toRequestBody(options.body),
    headers: {
      ...(options.headers ?? {}),
    },
  };

  if (requiresAuth(path)) {
    const token = getToken();
    if (token) {
      requestOptions.headers = {
        ...requestOptions.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  return api<T>(path, requestOptions);
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}) {
  return apiCall<T>(path, options);
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
