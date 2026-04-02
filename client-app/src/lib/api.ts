import { getToken } from "@/auth/token";
import { api } from "@/lib/apiClient";
import { ensureLockedApiBase } from "@/config/runtimeConfig";
const API_ENTRY_FLAG = "__BF_API_ACTIVE__";

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

function normalize(path: string): string {
  return ensureLockedApiBase(path);
}

function requiresAuth(path: string): boolean {
  return !path.startsWith("/auth") && !path.startsWith("auth") && !path.startsWith("/health") && !path.startsWith("health");
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return apiCall<T>(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
}

export async function apiCall<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if ((globalThis as Record<string, unknown>)[API_ENTRY_FLAG]) {
    throw new Error("NESTED_API_CALL_BLOCKED");
  }

  (globalThis as Record<string, unknown>)[API_ENTRY_FLAG] = true;

  try {
    const isFormData = options.body instanceof FormData;
    const body =
      isFormData || typeof options.body === "string"
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined;

    const headers = isFormData ? options.headers : { "Content-Type": "application/json", ...options.headers };

    const requestOptions: RequestInit = {
      ...options,
      headers: { ...(headers ?? {}) },
      body: body as BodyInit | null | undefined,
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

    return (await api<T>(normalize(path), requestOptions)) as T;
  } finally {
    delete (globalThis as Record<string, unknown>)[API_ENTRY_FLAG];
  }
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

export { api };
