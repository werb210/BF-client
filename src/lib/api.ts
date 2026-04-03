import { getToken } from "./authToken";
import { getRequestId } from "../utils/requestId";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080";

function buildHeaders(options: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!headers["x-request-id"]) {
    headers["x-request-id"] = getRequestId();
  }

  if (!headers["Authorization"]) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const shouldSetJsonContentType =
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers["Content-Type"];

  if (shouldSetJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

export async function apiCall<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res: any = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options),
    credentials: "include",
  });

  let payload: any = null;

  try {
    payload = await res.json?.();
  } catch {
    payload = null;
  }

  const status = res?.status ?? 200;
  const ok =
    typeof res?.ok === "boolean"
      ? res.ok
      : status >= 200 && status < 300;

  if (!ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        `API ERROR ${status}`
    );
  }

  if (payload?.status && payload.status !== "ok") {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        "API ERROR"
    );
  }

  if (payload?.status === "ok") {
    return payload.data;
  }

  return payload;
}

export const apiRequest = apiCall;
export const api = apiCall;
