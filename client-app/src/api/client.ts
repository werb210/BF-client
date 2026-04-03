import { apiCall } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

type HttpResponse<T = unknown> = {
  data: T;
  status: number;
  headers: Headers;
};

type RequestConfig = {
  url: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

type RequestInitLike = Omit<RequestInit, "body"> & { body?: unknown };
type UploadProgressHandler = (event: { loaded: number; total?: number }) => void;
type RequestInitWithExtras = RequestInitLike & { onUploadProgress?: UploadProgressHandler };

function normalizePath(path: string) {
  if (!path.startsWith("/")) {
    throw new Error("INVALID_API_PATH");
  }

  return path;
}

async function send<T = unknown>(
  method: string,
  path: string,
  data?: unknown,
  init?: RequestInitWithExtras
): Promise<HttpResponse<T>> {
  const payload = await apiCall<T>(normalizePath(path), { ...init, method, body: data as BodyInit | null | undefined });
  return { data: payload, status: 200, headers: new Headers() };
}

async function request<T = unknown>(urlOrConfig: string | RequestConfig, init?: RequestInitWithExtras): Promise<HttpResponse<T>> {
  if (typeof urlOrConfig === "string") {
    return send<T>(init?.method || "GET", urlOrConfig, init?.body, init);
  }

  const { url, method = "GET", data, headers, signal } = urlOrConfig;
  return send<T>(method, url, data, { headers, signal });
}

export const apiClient = {
  request,
  get: <T = unknown>(url: string, init?: RequestInitWithExtras) => send<T>("GET", url, undefined, init),
  post: <T = unknown>(url: string, data?: unknown, init?: RequestInitWithExtras) => send<T>("POST", url, data, init),
  patch: <T = unknown>(url: string, data?: unknown, init?: RequestInitWithExtras) => send<T>("PATCH", url, data, init),
  put: <T = unknown>(url: string, data?: unknown, init?: RequestInitWithExtras) => send<T>("PUT", url, data, init),
  delete: <T = unknown>(url: string, init?: RequestInitWithExtras) => send<T>("DELETE", url, undefined, init),
};

export { apiCall };

export function buildApiUrl(path: string): string {
  return normalizePath(path);
}

export default apiClient;

export async function startOtp(phone: string) {
  return apiCall(endpoints.otpStart, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  return apiCall(endpoints.otpVerify, {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}
