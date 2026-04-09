import { ENV } from "@/env";

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  method?: string;
  body?: any;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
};

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${ENV.API_BASE_URL}${path}`;

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const res = await fetch(url, {
    method: options.method || "GET",
    credentials: options.credentials ?? "include", // CRITICAL
    headers: isFormData
      ? options.headers
      : {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
    body:
      options.body == null
        ? undefined
        : isFormData || typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body),
  });

  const payload: unknown = await res.json().catch((): null => null);

  const isOk = typeof res.ok === "boolean" ? res.ok : res.status >= 200 && res.status < 300;

  if (!isOk) {
    const errorMessage =
      payload && typeof payload === "object"
        ? (payload as { error?: string; message?: string }).error ||
          (payload as { error?: string; message?: string }).message
        : null;

    if (errorMessage) {
      throw new Error(`API ERROR ${res.status}: ${errorMessage}`);
    }

    const text = typeof res.text === "function" ? await res.text() : "";
    throw new Error(`API ERROR ${res.status}: ${text}`);
  }

  if (payload && typeof payload === "object") {
    if ((payload as { status?: string }).status === "error") {
      throw new Error(`API ERROR ${res.status}: ${(payload as { error?: string }).error || "Unknown API error"}`);
    }

    if ((payload as { status?: string }).status === "ok" && "data" in (payload as Record<string, unknown>)) {
      return (payload as { data: T }).data;
    }
  }

  return payload as T;
}

// Backward-compatible aliases while callsites migrate.
export const apiCall = apiRequest;
export const api = apiRequest;

export async function apiPost<T = any>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body,
  });
}

export async function apiUpload<T = any>(path: string, formData: FormData): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: formData,
  });
}
