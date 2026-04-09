import { ENV } from "@/env";

type RequestOptions = Omit<RequestInit, "body"> & {
  method?: string;
  body?: any;
};

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${ENV.API_BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;
  const body =
    options.body == null
      ? undefined
      : typeof options.body === "string" || options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body);

  const res = await fetch(url, {
    method: options.method || "GET",
    credentials: "include", // CRITICAL
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {}),
    },
    body,
  });

  const json = await res.json().catch((): null => null);

  const isOk = typeof res.ok === "boolean" ? res.ok : res.status >= 200 && res.status < 300;

  if (!isOk) {
    const detail =
      (json as { error?: string; message?: string } | null)?.error ||
      (json as { error?: string; message?: string } | null)?.message ||
      (await res.text().catch((): string => ""));
    throw new Error(`API ERROR ${res.status}: ${detail}`);
  }

  const payload =
    json && typeof json === "object" && (json as { status?: string }).status === "ok"
      ? (json as { data?: unknown }).data ?? json
      : json;

  return payload as T;
}

export const apiCall = apiRequest;
export const api = apiRequest;

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body,
  });
}

export async function apiUpload<T = any>(path: string, formData: FormData): Promise<T> {
  const url = `${ENV.API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const isOk = typeof res.ok === "boolean" ? res.ok : res.status >= 200 && res.status < 300;

  if (!isOk) {
    const text = await res.text();
    throw new Error(`API ERROR ${res.status}: ${text}`);
  }

  return res.json();
}
