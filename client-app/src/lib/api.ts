function withApiPrefix(path: string) {
  return path.startsWith("/api") ? path : `/api${path}`;
}

export async function api(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(withApiPrefix(path), {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    credentials: "include",
    ...options,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const status = typeof res.status === "number" ? res.status : 200;
  const ok = typeof res.ok === "boolean" ? res.ok : status >= 200 && status < 300;

  if (!ok || (data?.status && data.status !== "ok")) {
    throw new Error(data?.error?.message || data?.error || data?.message || "API_ERROR");
  }

  if (data?.status === "ok") {
    return data.data;
  }

  return data;
}

export const apiCall = api;
export const apiRequest = api;

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return api(path, {
    method: "POST",
    body: body == null ? undefined : JSON.stringify(body),
  }) as Promise<T>;
}

export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  return api(path, {
    method: "POST",
    headers: {},
    body: formData,
  }) as Promise<T>;
}

export const apiSubmit = api;
