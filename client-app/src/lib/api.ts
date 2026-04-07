const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("Missing VITE_API_URL");
}

export const authToken = {
  get: () => localStorage.getItem("bf_jwt_token"),
  set: (token: string) => localStorage.setItem("bf_jwt_token", token),
  clear: () => localStorage.removeItem("bf_jwt_token"),
};

function getAuthHeaders() {
  const token = authToken.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parsePayload(json: any) {
  if (json?.status === "ok") {
    return json.data;
  }

  if (json?.status === "error") {
    throw new Error(json.error || "API error");
  }

  return json;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

export async function apiCall<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetchWithTimeout(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const json = await res.json().catch(() => ({}));
  const hasWrappedSuccess = json?.status === "ok";

  if (!res.ok && !hasWrappedSuccess) {
    const parsed = parsePayload(json);
    const errorText = (parsed as { error?: string })?.error || (json as { error?: string })?.error || "API error";
    throw new Error(errorText);
  }

  return parsePayload(json) as T;
}

export const api = apiCall;
export const apiRequest = apiCall;

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body: body == null ? undefined : JSON.stringify(body),
  });
}

export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    headers: {},
    body: formData,
  });
}
