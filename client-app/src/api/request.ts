import type { AxiosRequestHeaders } from "axios";
import { apiClient, buildApiUrl } from "./client";

function toHeaders(headers?: HeadersInit): AxiosRequestHeaders {
  if (!headers) return {} as AxiosRequestHeaders;

  const parsed = new Headers(headers);
  const result: Record<string, string> = {};
  parsed.forEach((value, key) => {
    result[key] = value;
  });
  return result as AxiosRequestHeaders;
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
  const headers = {
    ...toHeaders(options.headers),
  };
  const response = await apiClient.request<T>({
    url: path,
    method: options.method || "GET",
    data: toData(options.body),
    headers,
  });

  return response.data;
}

export function getApiBaseUrl() {
  return apiUrl("");
}
