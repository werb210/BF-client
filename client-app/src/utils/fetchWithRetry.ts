import api from "@/api/client";
const DEFAULT_TIMEOUT_MS = 15000;

export class FetchRequestError extends Error {
  constructor(
    message: string,
    public status?: number,
    public timedOut = false
  ) {
    super(message);
  }
}

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { timeoutMs?: number }
) {
  const { controller, timeoutId } = withTimeoutSignal(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await api.request({
      url: String(input),
      method: init?.method,
      data: init?.body,
      headers: init?.headers as Record<string, string> | undefined,
      signal: controller.signal,
    });

    const { data } = response;
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: new Headers(response.headers as HeadersInit),
    });
  } catch (error) {
    if (error instanceof FetchRequestError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new FetchRequestError("Request timed out.", undefined, true);
    }

    if (error instanceof Error && /^API_ERROR_(\d+)$/.test(error.message)) {
      const status = Number(error.message.replace("API_ERROR_", ""));

      if (status === 401 && typeof window !== "undefined") {
        window.location.assign("/apply/step-1");
      }

      throw new FetchRequestError(`Request failed with status ${status}.`, status);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { maxAttempts?: number; timeoutMs?: number }
) {
  void options?.maxAttempts;
  return safeFetch(input, init, { timeoutMs: options?.timeoutMs });
}
