import { endpoints } from "@/lib/endpoints";
import { ENV } from "@/env";

type HttpResponse<T = unknown> = {
  data: T;
  status: number;
  headers: Headers;
};

type UploadProgressHandler = (event: { loaded: number; total?: number }) => void;
type RequestInitLike = Omit<RequestInit, "body"> & { body?: unknown; onUploadProgress?: UploadProgressHandler };

type RequestConfig = {
  url: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

const API_BASE = ENV.API_BASE || "https://server.boreal.financial";

function getAuthHeaders(headers?: HeadersInit): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  return {
    ...(headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function send<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInitLike,
): Promise<HttpResponse<T>> {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const { onUploadProgress: _onUploadProgress, ...fetchInit } = init || {};

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchInit,
    method,
    credentials: "include",
    headers: isFormData
      ? getAuthHeaders(init?.headers)
      : getAuthHeaders({
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        }),
    body:
      body == null
        ? undefined
        : isFormData || typeof body === "string"
          ? (body as BodyInit)
          : JSON.stringify(body),
  });

  let json: any = null;

  try {
    json = await response.json();
  } catch {
    // no json body
  }

  const isOk = response.ok || (response.status >= 200 && response.status < 300);

  if (isOk && json?.status === "ok") {
    return {
      data: json.data as T,
      status: response.status,
      headers: response.headers,
    };
  }

  if (json?.status === "error") {
    throw new Error(json.error || json.message || "Unknown API error");
  }

  if (!isOk) {
    throw new Error(json?.error || json?.message || `HTTP ${response.status}`);
  }

  if (isOk) {
    return {
      data: json as T,
      status: response.status,
      headers: response.headers,
    };
  }

  throw new Error(`Malformed API response (status ${response.status})`);
}

export const apiClient = {
  request: async <T = unknown>(urlOrConfig: string | RequestConfig, init?: RequestInitLike): Promise<HttpResponse<T>> => {
    if (typeof urlOrConfig === "string") {
      return send<T>(init?.method || "GET", urlOrConfig, init?.body, init);
    }

    return send<T>(
      urlOrConfig.method || "GET",
      urlOrConfig.url,
      urlOrConfig.data,
      {
        headers: urlOrConfig.headers,
        signal: urlOrConfig.signal,
      },
    );
  },
  get: <T = unknown>(url: string, init?: RequestInitLike) => send<T>("GET", url, undefined, init),
  post: <T = unknown>(url: string, data?: unknown, init?: RequestInitLike) => send<T>("POST", url, data, init),
  patch: <T = unknown>(url: string, data?: unknown, init?: RequestInitLike) => send<T>("PATCH", url, data, init),
  put: <T = unknown>(url: string, data?: unknown, init?: RequestInitLike) => send<T>("PUT", url, data, init),
  delete: <T = unknown>(url: string, init?: RequestInitLike) => send<T>("DELETE", url, undefined, init),
};

export async function apiCall<T = unknown>(
  urlOrConfig: string | RequestConfig,
  init?: RequestInitLike,
): Promise<T> {
  const res = await apiClient.request<T>(urlOrConfig, init);
  return res.data;
}

export function buildApiUrl(path: string): string {
  return path;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ENV.API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("API ERROR:", res.status, text);
    throw new Error(`API ${res.status}`);
  }

  return res.json();
}

export async function startOtp(phone: string) {
  return apiCall(endpoints.otpStart, {
    method: "POST",
    body: { phone },
  });
}

export async function verifyOtp(phone: string, code: string) {
  return apiCall(endpoints.otpVerify, {
    method: "POST",
    body: { phone, code },
  });
}

export async function startCall(payload: unknown) {
  const res = await apiClient.post(endpoints.callStart, payload);

  if (
    !res ||
    (res.data && typeof res.data === "object" && "error" in (res.data as Record<string, unknown>))
  ) {
    throw new Error("Call start failed");
  }

  return res.data;
}

export default apiClient;
