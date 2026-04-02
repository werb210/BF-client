import { ApiResponseSchema } from "@boreal/shared-contract";
import { getEnv } from "../config/env";
import { getToken } from "./authToken";

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

  const json = await res.json();
  const parsed = ApiResponseSchema.safeParse(json);

  if (!parsed.success) {
    console.error("INVALID API SHAPE:", json);
    throw new Error("API contract violation");
  }

  if (parsed.data.status !== "ok") {
    console.error("API FAILURE:", {
      path,
      response: parsed.data,
    });
    throw new Error(parsed.data.error || "API error");
  }

  return parsed.data.data as T;
}
