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

  if (res.status === 401) {
    console.error("AUTH FAILURE: 401");

    localStorage.removeItem("bf_access_token");

    window.location.href = "/login";

    throw new Error("Unauthorized");
  }

  const json: ApiResponse<T> = await res.json();

  if (!json || typeof json !== "object" || !("status" in json)) {
    console.error("INVALID API SHAPE:", json);
    throw new Error("Invalid API response shape");
  }

  if (json.status !== "ok") {
    console.error("API FAILURE:", {
      path,
      response: json,
    });
    throw new Error(json.error || "API error");
  }

  return json.data as T;
}
