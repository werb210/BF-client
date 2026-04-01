import { api } from "./apiClient";

if (import.meta.env.MODE !== "test" && !import.meta.env.VITE_API_URL) {
  throw new Error("VITE_API_URL_NOT_DEFINED");
}

const base = import.meta.env.VITE_API_URL;

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const body =
    isFormData || typeof options.body === "string"
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined;

  const headers = isFormData ? options.headers : { "Content-Type": "application/json", ...options.headers };

  return (await api<T>(`${base}${path}`, {
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
