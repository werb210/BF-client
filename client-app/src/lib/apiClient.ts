export type DegradedApiResult = {
  degraded: true;
};

type ApiEnvelope<T> = {
  status?: "ok" | "error" | string;
  data?: T;
  error?:
    | {
        code?: string;
        message?: string;
      }
    | string;
};

function resolveErrorCode(error: ApiEnvelope<unknown>["error"]): string {
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
    throw new Error("INVALID_API_RESPONSE");
  }

  if (json.status === "error") {
    const errorCode = resolveErrorCode(json.error);

    if (errorCode === "DB_NOT_READY") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("api:degraded"));
      }
      return { degraded: true };
    }

    throw new Error(errorCode);
  }

  if (json.status !== "ok") {
    throw new Error("INVALID_STATUS");
  }

  return json.data as T;
}
