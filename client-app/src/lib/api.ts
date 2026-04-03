export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload: any = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  const isOk = typeof res.ok === "boolean" ? res.ok : (res.status >= 200 && res.status < 300);
  if (!isOk) {
    const message = payload?.message || payload?.error || "Request failed";
    throw new Error(message);
  }

  if (payload?.status === "error") {
    throw new Error(payload?.error || payload?.message || "Request failed");
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}
