export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResult<T>> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const requestOptions: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  if (
    requestOptions.body &&
    typeof requestOptions.body !== "string" &&
    !(requestOptions.body instanceof FormData)
  ) {
    requestOptions.body = JSON.stringify(requestOptions.body);
  }

  let response: Response;

  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Network request failed: ${error.message}`
        : "Network request failed"
    );
  }

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string } | null)?.message ||
      response.statusText ||
      "Request failed";

    return { success: false, message };
  }

  return { success: true, data: payload as T };
}
