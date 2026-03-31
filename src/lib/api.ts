export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

const RAW_API_BASE_URL = import.meta.env.VITE_API_URL;

if (!RAW_API_BASE_URL) {
  throw new Error("VITE_API_URL is required");
}

let validatedBaseUrl: URL;

try {
  validatedBaseUrl = new URL(RAW_API_BASE_URL);
} catch {
  throw new Error("VITE_API_URL must be a valid absolute URL");
}

const API_BASE_URL = validatedBaseUrl.toString().replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 10_000;

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

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort("timeout");
  }, REQUEST_TIMEOUT_MS);

  const upstreamAbortListener = () => {
    timeoutController.abort("upstream_abort");
  };

  if (options.signal) {
    if (options.signal.aborted) {
      upstreamAbortListener();
    } else {
      options.signal.addEventListener("abort", upstreamAbortListener, { once: true });
    }
  }

  requestOptions.signal = timeoutController.signal;

  let response: Response;

  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    const message = timeoutController.signal.reason === "timeout" ? "timeout" : "network_error";
    console.error({ path, error });
    return { success: false, message };
  } finally {
    clearTimeout(timeoutId);
    if (options.signal) {
      options.signal.removeEventListener("abort", upstreamAbortListener);
    }
  }

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error =
      (payload as { message?: string } | null)?.message ||
      response.statusText ||
      "Request failed";

    console.error({ path, error });
    return { success: false, message: error };
  }

  return { success: true, data: payload as T };
}
