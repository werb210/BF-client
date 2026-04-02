import { env } from "../config/env";

function getToken(): string | null {
  return localStorage.getItem(env.JWT_STORAGE_KEY);
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();

  const res = await fetch(`${env.API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 503) {
    throw new Error("SERVICE_NOT_READY");
  }

  if (res.status === 401) {
    localStorage.removeItem(env.JWT_STORAGE_KEY);
    throw new Error("UNAUTHORIZED");
  }

  if (res.status === 410) {
    throw new Error("ENDPOINT_DEPRECATED");
  }

  return res;
}

export async function api<T = unknown>(
  path: string,
  options?: {
    method?: string;
    body?: any;
  }
): Promise<T> {
  const res = await apiFetch(path, {
    method: options?.method || "GET",
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json();
  if (!json || typeof json !== "object" || !("status" in json)) {
    throw new Error("API contract violation");
  }

  const payload = json as { status: string; data?: T; error?: string };

  if (payload.status !== "ok") {
    throw new Error(payload.error || "API error");
  }

  return payload.data as T;
}
