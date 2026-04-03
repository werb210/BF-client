const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://server.boreal.financial";

function toUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizeBody(body: BodyInit | Record<string, unknown> | null | undefined): BodyInit | undefined {
  if (body == null) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  return JSON.stringify(body);
}

/**
 * Core API call (FIXES missing export + standardises all calls)
 */
export async function apiCall<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (normalizeBody(options.body as BodyInit | Record<string, unknown> | undefined) instanceof FormData) {
    delete headers["Content-Type"];
  }

  const res: any = await fetch(toUrl(path), {
    ...options,
    headers,
    body: normalizeBody(options.body as BodyInit | Record<string, unknown> | undefined),
    credentials: "include",
  });

  let payload: any = null;
  try {
    payload = await res.json?.();
  } catch {
    payload = null;
  }

  const status = res?.status ?? 200;
  const ok =
    typeof res?.ok === "boolean"
      ? res.ok
      : status >= 200 && status < 300;

  const message =
    payload?.error?.message ||
    payload?.error ||
    payload?.message ||
    `API ERROR ${status}`;

  if (!ok) {
    throw new Error(message);
  }

  if (payload?.status && payload.status !== "ok") {
    throw new Error(message);
  }

  if (payload?.status === "ok") {
    return payload.data as T;
  }

  return payload as T;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return apiCall<T>(path, options);
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body: body == null ? undefined : JSON.stringify(body),
  });
}

export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body: formData,
  });
}

/**
 * Keep compatibility for existing code
 */
export const apiSubmit = apiCall;
