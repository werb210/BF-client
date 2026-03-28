import axios from "axios";
import api from "@/api/client";

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
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

    if (axios.isAxiosError(error)) {
      if (error.code === "ERR_CANCELED") {
        throw new FetchRequestError("Request timed out.", undefined, true);
      }

      const status = error.response?.status;

      if (status === 401 && typeof window !== "undefined") {
        window.location.assign("/apply/step-1");
      }

      if (typeof status === "number") {
        throw new FetchRequestError(`Request failed with status ${status}.`, status);
      }
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
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 2);
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const response = await safeFetch(input, init, { timeoutMs: options?.timeoutMs });
      if (response.ok || !RETRYABLE_STATUS.has(response.status) || attempt >= maxAttempts) {
        return response;
      }
    } catch (error) {
      const shouldRetry =
        error instanceof FetchRequestError &&
        (error.timedOut || (typeof error.status === "number" && RETRYABLE_STATUS.has(error.status)));

      if (!shouldRetry || attempt >= maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Request failed after retries.");
}
