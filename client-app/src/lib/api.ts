import { getEnv } from "@/config/env";
import { ApiResponseSchema } from "@boreal/shared-contract";

const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 2;

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

function getAuthToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("token") ?? localStorage.getItem("bf_access_token");
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function toRequestBody(body: unknown): BodyInit | undefined {
  if (body == null) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

export async function api<T>(path: string, options: RequestInit = {}, attempt = 0): Promise<T> {
  const { VITE_API_URL } = getEnv();

  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  try {
    const res = await fetchWithTimeout(
      `${VITE_API_URL}${path}`,
      {
        credentials: "include",
        ...options,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      },
      DEFAULT_TIMEOUT
    );

    if (res.status === 401) {
      localStorage.removeItem("bf_access_token");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    const json = await safeJson(res);

    const parsed = ApiResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error("API contract violation");
    }

    if (parsed.data.status !== "ok") {
      throw new Error(parsed.data.error || "API returned error");
    }

    return parsed.data.data as T;
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : "";
    const isRetryable =
      err?.name === "AbortError" || message.includes("Network") || message.includes("Failed to fetch");

    if (isRetryable && attempt < MAX_RETRIES) {
      return api<T>(path, options, attempt + 1);
    }

    console.error("API FAILURE:", {
      path,
      attempt,
      error: err,
    });

    throw err;
  }
}

export async function apiCall<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return api<T>(path, {
    ...options,
    body: toRequestBody(options.body),
  });
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}) {
  return api<T>(path, options);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body,
  });
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body: formData,
  });
}

export async function apiAuth<T = unknown>(
  path: string,
  token: string | null | undefined,
  options: ApiRequestOptions = {}
) {
  if (!token) {
    throw new Error("MISSING_AUTH_TOKEN");
  }

  return apiCall<T>(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
