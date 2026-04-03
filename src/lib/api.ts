const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080";

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res: any = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
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

export const api = apiRequest;
