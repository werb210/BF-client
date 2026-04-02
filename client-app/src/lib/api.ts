import { env } from "@/config/env";

const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 2;

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(env.JWT_STORAGE_KEY);
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number) {
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

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers ?? {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetchWithTimeout(
    `${env.API_URL}${path}`,
    {
      credentials: "include",
      ...options,
      headers,
    },
    DEFAULT_TIMEOUT
  );

  if (res.status === 503) {
    throw new Error("SERVICE_NOT_READY");
  }

  if (res.status === 401) {
    localStorage.removeItem(env.JWT_STORAGE_KEY);
    throw new Error("UNAUTHORIZED");
  }

  if (res.status === 410) {
    throw new Error("ENDPOINT_DEPRECATED");
  }

  return res;
}

export async function api<T>(path: string, options: RequestInit = {}, attempt = 0): Promise<T> {
  try {
    const res = await apiFetch(path, options);
    const json = await safeJson(res);

    if (!json || typeof json !== "object" || !("status" in json)) {
      throw new Error("API_CONTRACT_VIOLATION");
    }

    const payload = json as { status: string; data?: T; error?: string };

    if (payload.status !== "ok") {
      throw new Error(payload.error || "API_ERROR");
    }

    return payload.data as T;
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : "";
    const isRetryable =
      err?.name === "AbortError" || message.includes("Network") || message.includes("Failed to fetch");

    if (isRetryable && attempt < MAX_RETRIES) {
      return api<T>(path, options, attempt + 1);
    }

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
