const API_BASE = import.meta.env.VITE_API_URL || "https://server.boreal.financial";

type ApiOptions = RequestInit & { raw?: boolean };

type ApiResponse<T> = {
  data: T;
  status: number;
  headers: Headers;
};

function toUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE}${path}`;
}

function withJsonHeaders(options: ApiOptions): RequestInit {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = new Headers(options.headers || undefined);

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return {
    ...options,
    headers,
  };
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const res = await fetch(toUrl(path), {
    credentials: "include",
    ...withJsonHeaders(options),
  });

  if (options.raw) return res;

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");

  if (!res.ok) {
    const body = isJson ? await res.json().catch(() => null) : await res.text();
    throw new Error(`API ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }

  return isJson ? res.json() : res.text();
}

async function requestInternal<T = unknown>(
  path: string,
  method: string,
  data?: unknown,
  headers?: HeadersInit
): Promise<ApiResponse<T>> {
  const body =
    data === undefined
      ? undefined
      : data instanceof FormData
        ? data
        : typeof data === "string"
          ? data
          : JSON.stringify(data);

  const response = await apiFetch(path, {
    method,
    body,
    headers,
    raw: true,
  });

  const ct = response.headers.get("content-type") || "";
  const parsed = ct.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text();

  return {
    data: parsed as T,
    status: response.status,
    headers: response.headers,
  };
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await requestInternal<T>(path, options.method || "GET", options.body, options.headers);
  return response.data;
}

export function requireAuth(): string {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login";
    throw new Error("Not authenticated");
  }

  return token;
}

export function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, options);
}

export function buildUrl(path: string): string {
  return toUrl(path);
}

const api = {
  interceptors: {
    request: { use: () => 0, eject: () => {} },
    response: { use: () => 0, eject: () => {} },
  },
  request<T = unknown>(config: { url: string; method?: string; data?: unknown; headers?: HeadersInit }) {
    return requestInternal<T>(config.url, config.method || "GET", config.data, config.headers);
  },
  get<T = unknown>(url: string) {
    return requestInternal<T>(url, "GET");
  },
  post<T = unknown>(url: string, data?: unknown, config?: { headers?: HeadersInit }) {
    return requestInternal<T>(url, "POST", data, config?.headers);
  },
  patch<T = unknown>(url: string, data?: unknown, config?: { headers?: HeadersInit }) {
    return requestInternal<T>(url, "PATCH", data, config?.headers);
  },
  put<T = unknown>(url: string, data?: unknown, config?: { headers?: HeadersInit }) {
    return requestInternal<T>(url, "PUT", data, config?.headers);
  },
  delete<T = unknown>(url: string) {
    return requestInternal<T>(url, "DELETE");
  },
};

export { api };
export default api;
