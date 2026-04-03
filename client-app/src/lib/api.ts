export async function apiCall<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const base = import.meta.env.VITE_API_URL;

  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(((options.headers as Record<string, string>) || {})),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || "API error");
  }

  return data as T;
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
