import { env } from "@/config/env";
import { clearToken, getToken } from "@/auth/token";

type ApiOk<T> = { status: "ok"; data?: T };
type ApiErr = { status: "error"; error?: string };
type ApiResponse<T> = ApiOk<T> | ApiErr;
type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function parseJson<T>(res: Response): Promise<ApiResponse<T> | null> {
  try {
    return (await res.json()) as ApiResponse<T>;
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

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${env.API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 503) throw new Error("SERVICE_NOT_READY");
  if (res.status === 401) {
    clearToken();
    throw new Error("UNAUTHORIZED");
  }
  if (res.status === 410) throw new Error("ENDPOINT_DEPRECATED");

  const body = await parseJson<T>(res);
  if (!body) throw new Error("INVALID_RESPONSE");
  if (body.status !== "ok") throw new Error(body.error || "REQUEST_FAILED");

  return (body.data ?? null) as T;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(path, options);
}

export async function apiCall<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    body: toRequestBody(options.body),
  });
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
