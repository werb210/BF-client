import { getToken } from "@/auth/token";

const base = "/api";
const API_ENTRY_FLAG = "__BF_API_ACTIVE__";

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

type ApiEnvelope<T> = {
  status?: "ok" | "error" | string;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

function normalize(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("INVALID_API_PATH");
  }

  return `${base}${path}`;
}

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === "object") {
    Object.freeze(obj);

    if (Array.isArray(obj)) {
      obj.forEach((value) => deepFreeze(value));
    } else {
      Object.values(obj as Record<string, unknown>).forEach((value) => deepFreeze(value));
    }
  }

  return obj;
}

function validateEnvelope(json: ApiEnvelope<unknown>): ApiEnvelope<unknown> {
  if (!json || typeof json !== "object") {
    throw new Error("INVALID_API_RESPONSE");
  }

  if (!json.status) {
    throw new Error("MISSING_STATUS_FIELD");
  }

  if (json.status === "ok" && json.data === undefined) {
    throw new Error("MISSING_DATA_FIELD");
  }

  if (json.status === "error") {
    if (!json.error) {
      throw new Error("MISSING_ERROR_FIELD");
    }

    if (typeof json.error.code !== "string") {
      throw new Error("INVALID_ERROR_SHAPE");
    }
  }

  return json;
}

function requiresAuth(path: string): boolean {
  return !path.startsWith("/auth") && !path.startsWith("auth") && !path.startsWith("/health") && !path.startsWith("health");
}

export async function api(path: string, options: RequestInit = {}): Promise<unknown> {
  if ((globalThis as Record<string, unknown>)[API_ENTRY_FLAG]) {
    throw new Error("NESTED_API_CALL_BLOCKED");
  }

  (globalThis as Record<string, unknown>)[API_ENTRY_FLAG] = true;

  try {
    const requestOptions: RequestInit = {
      ...options,
      headers: { ...(options.headers ?? {}) },
    };

    if (requiresAuth(path)) {
      const token = getToken();

      if (!token) {
        throw new Error("MISSING_AUTH_TOKEN");
      }

      requestOptions.headers = {
        ...requestOptions.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    const res = await fetch(normalize(path), requestOptions);

    if (res.bodyUsed) {
      throw new Error("REUSED_RESPONSE_BLOCKED");
    }

    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }

    let json: ApiEnvelope<unknown>;
    try {
      json = (await res.json()) as ApiEnvelope<unknown>;
    } catch {
      throw new Error("INVALID_JSON_RESPONSE");
    }

    const validated = validateEnvelope(json);

    if (validated.status === "error") {
      throw new Error(validated.error?.code || "API_ERROR_RESPONSE");
    }

    return deepFreeze(validated);
  } finally {
    delete (globalThis as Record<string, unknown>)[API_ENTRY_FLAG];
  }
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}) {
  const envelope = (await api(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })) as ApiEnvelope<T>;

  return envelope.data as T;
}

export async function apiCall<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const body =
    isFormData || typeof options.body === "string"
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined;

  const headers = isFormData ? options.headers : { "Content-Type": "application/json", ...options.headers };

  const envelope = (await api(path, {
    ...options,
    headers,
    body,
  })) as ApiEnvelope<T>;

  return envelope.data as T;
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

export async function apiAuth<T = unknown>(path: string, token: string | null | undefined, options: ApiRequestOptions = {}) {
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

export type ApiResponse<T> = T;
