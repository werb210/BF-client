import { getApiBase } from "@/config/api";

const API_BASE = getApiBase();

type ApiEnvelope<T> = {
  status?: string;
  data?: T;
};

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const rootBase = API_BASE.replace(/\/api\/v1$/, "");
  const url = path.startsWith("/api/") ? `${rootBase}${path}` : `${API_BASE}${path}`;

  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const json = (await res.json()) as ApiEnvelope<T> | T;

  if (json && typeof json === "object" && "status" in json && (json as ApiEnvelope<T>).status === "ok") {
    return ((json as ApiEnvelope<T>).data ?? {}) as T;
  }

  return json as T;
}

export const api = apiFetch;
