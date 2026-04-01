type ApiEnvelope<T> = {
  status?: "ok" | "error" | string;
  data?: T;
  error?: {
    message?: string;
    code?: string;
  } | string;
};

export type DegradedApiResult = {
  degraded: true;
};

function resolveErrorMessage(error: ApiEnvelope<unknown>["error"]): string {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object") {
    if (typeof error.code === "string" && error.code.trim().length > 0) {
      return error.code;
    }

    if (typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message;
    }
  }

  return "API_ERROR";
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T | DegradedApiResult> {
  const res = await fetch(path, opts);

  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("INVALID_JSON_RESPONSE");
  }

  if (!json || typeof json !== "object") {
    throw new Error("INVALID_API_SHAPE");
  }

  if (json.status === "error") {
    const message = resolveErrorMessage(json.error);
    if (message === "DB_NOT_READY") {
      return { degraded: true };
    }
    throw new Error(message);
  }

  if (json.status !== "ok") {
    throw new Error("UNKNOWN_STATUS");
  }

  return json.data as T;
}
