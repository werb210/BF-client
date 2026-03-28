export type ApiEnvelope<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function assertApiResponse<T = unknown>(data: unknown): T {
  if (!data || typeof (data as { success?: unknown }).success !== "boolean") {
    throw new Error("Invalid API response");
  }

  const response = data as ApiEnvelope<T>;

  if (!response.success) {
    throw new Error(response.error || "Request failed");
  }

  return response.data as T;
}
