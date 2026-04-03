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

  const res = await fetch(toUrl(path), {
    ...options,
    headers,
    body: normalizeBody(options.body as BodyInit | Record<string, unknown> | undefined),
    credentials: "include",
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw data || {
      status: "error",
      error: { message: "request_failed" },
    };
  }

  return data as T;
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
