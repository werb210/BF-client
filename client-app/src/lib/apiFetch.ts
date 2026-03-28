import { API_BASE_URL } from "@/config/api";

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  if (path.startsWith("/api")) {
    throw new Error("INVALID_API_PATH: /api prefix is forbidden");
  }

  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API_ERROR ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, options);
}

export function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
