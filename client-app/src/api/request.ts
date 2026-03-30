import { apiClient, buildApiUrl } from "./client";

function toHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};

  const parsed = new Headers(headers);
  const result: Record<string, string> = {};
  parsed.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function toData(body?: BodyInit | null) {
  if (typeof body !== "string") {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export function apiUrl(path: string) {
  return buildApiUrl(path);
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiClient.request<T>({
    url: path,
    method: options.method || "GET",
    data: toData(options.body),
    headers: toHeaders(options.headers),
  });

  return response.data;
}

export function getApiBaseUrl() {
  return apiUrl("");
}
