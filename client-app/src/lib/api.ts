import { apiCall as clientApiCall } from "@/api/client";

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
  const payload = await clientApiCall<any>(path, {
    method: options.method || "GET",
    headers: options.headers,
    body: options.body,
    signal: options.signal,
  });

  if (payload && typeof payload === "object") {
    if ((payload as { status?: string }).status === "error") {
      throw new Error(
        `API ERROR: ${(payload as { error?: string }).error || "Unknown API error"}`,
      );
    }

    if ((payload as { status?: string }).status === "ok" && "data" in (payload as Record<string, unknown>)) {
      return (payload as { data: T }).data;
    }
  }

  return payload as T;
}

export const api = apiRequest;
export const apiCall = apiRequest;
export const apiPost = <T = any>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: "POST",
    body,
  });

export const apiUpload = <T = any>(path: string, formData: FormData) =>
  apiRequest<T>(path, {
    method: "POST",
    body: formData,
  });
