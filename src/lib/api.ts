const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://server.boreal.financial";

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload: any = null;

  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new Error(`API ERROR ${res.status}`);
  }

  if (payload?.status && payload.status !== "ok") {
    const message =
      payload?.error?.message ||
      payload?.message ||
      JSON.stringify(payload);

    throw new Error(`API ERROR: ${message}`);
  }

  if (payload?.status === "ok") {
    return payload.data;
  }

  return payload;
}

export const api = apiRequest;
