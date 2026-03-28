export type ApiEnvelope<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function assertApiResponse<T = unknown>(res: unknown): T {
  if (!res || typeof res !== "object") {
    throw new Error("Invalid API response");
  }

  const response = res as ApiEnvelope<T>;

  if (response.success !== true) {
    throw new Error(response.error || "API failure");
  }

  return response.data as T;
}
