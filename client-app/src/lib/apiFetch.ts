import { api } from "@/lib/api";

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await api.request<T>({
    url: path,
    method: options.method,
    headers: options.headers as Record<string, string> | undefined,
    data: isForm
      ? options.body
      : typeof options.body === "string"
        ? JSON.parse(options.body)
        : options.body,
  });

  return response.data;
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, options);
}

export function buildUrl(path: string): string {
  return `${api.defaults.baseURL || ""}${path}`;
}
