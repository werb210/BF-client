import axios, { AxiosHeaders, type AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";

const WRITE_METHODS = new Set(["post", "put", "patch", "delete"]);

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createHttpClient(config: AxiosRequestConfig): AxiosInstance {
  const client = axios.create(config);

  client.interceptors.request.use((requestConfig) => {
    const method = (requestConfig.method || "get").toLowerCase();
    const headers = AxiosHeaders.from(requestConfig.headers);

    if (!headers.get("X-Request-Id")) {
      headers.set("X-Request-Id", randomId());
    }

    if (WRITE_METHODS.has(method) && !headers.get("Idempotency-Key")) {
      headers.set("Idempotency-Key", randomId());
    }

    requestConfig.headers = headers;

    return requestConfig;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        const status = error.response.status;
        const message = `Request failed with status ${status}`;
        throw new ApiError(message, status, error.response.data);
      }

      throw error;
    }
  );

  return client;
}
