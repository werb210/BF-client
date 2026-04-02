export async function apiFetch(url: string, options: RequestInit = {}) {
  url = url.replace(/([^:]\/)\/+/g, "$1");

  const requestId = (options.headers as Record<string, string> | undefined)?.["x-request-id"] ||
    crypto.randomUUID();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
    "x-request-id": requestId,
  };

  if (!headers["Authorization"] && typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const nativeFetch = globalThis.fetch.bind(globalThis);

  return nativeFetch(url, {
    ...options,
    headers,
  });
}
