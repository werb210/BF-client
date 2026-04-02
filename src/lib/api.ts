import { getEnv } from "../config/env";
import { getToken } from "./authToken";

type ApiResponse<T> = {
  status: "ok" | "error" | "not_ready";
  data?: T;
  error?: string;
};

export async function api<T = unknown>(
  path: string,
  options?: {
    method?: string;
    body?: any;
  }
): Promise<T> {
  const { VITE_API_URL } = getEnv();
  const token = getToken();

  const res = await fetch(`${VITE_API_URL}${path}`, {
    method: options?.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const json: ApiResponse<T> = await res.json();

  if (json.status !== "ok") {
    throw new Error(json.error || "API error");
  }

  return json.data as T;
}
