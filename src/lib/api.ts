import { api } from "./apiClient";

const url = import.meta.env.VITE_API_URL;

if (!url) {
  throw new Error("MISSING_API_URL");
}

if (!url.includes("/api/v1")) {
  throw new Error("INVALID_API_VERSION");
}

const base = url.replace(/\/+$/, "");

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("INVALID_API_PATH");
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

  return (await api<T>(`${base}${normalizePath(path)}`, {
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
