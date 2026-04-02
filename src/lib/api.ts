import { api } from "./apiClient";
import { API_BASE } from "../api/base";

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("INVALID_API_PATH");
  }

  if (path.startsWith("/api/")) {
    throw new Error("DIRECT_API_PATH_FORBIDDEN");
  }

  if (/^https?:\/\//i.test(path)) {
    throw new Error("ABSOLUTE_API_PATH_FORBIDDEN");
  }

  return path;
}

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const body =
    isFormData || typeof options.body === "string"
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined;

  const headers = isFormData ? options.headers : { "Content-Type": "application/json", ...options.headers };

  return (await api<T>(`${API_BASE}${normalizePath(path)}`, {
    ...options,
    headers,
    body,
  })) as T;
}

export async function apiWithAuth<T = unknown>(
  path: string,
  token: string | null | undefined,
  options: ApiRequestOptions = {}
): Promise<T> {
  if (!token) {
    throw new Error("MISSING_AUTH_TOKEN");
  }

  return apiRequest<T>(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export { api };
