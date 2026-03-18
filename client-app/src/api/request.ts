import type { AxiosRequestHeaders } from "axios";
import { apiClient, buildApiUrl } from "./client";
import { getToken } from "@/lib/auth";

function toHeaders(headers?: HeadersInit): AxiosRequestHeaders {
  if (!headers) return { "Content-Type": "application/json" } as AxiosRequestHeaders;

  const parsed = new Headers(headers);
  const result: Record<string, string> = { "Content-Type": "application/json" };
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
  const token = getToken();
  const headers = {
    ...toHeaders(options.headers),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
