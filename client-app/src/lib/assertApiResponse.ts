export type ApiEnvelope<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function assertApiResponse<T = unknown>(res: unknown): T {
  if (!res || typeof res !== "object") {
    throw new Error("Invalid API response");
  }

  const envelope = res as ApiEnvelope<T>;

  if (envelope.success !== true) {
    throw new Error(envelope.error || "API failure");
  }

  if (!envelope.data) {
    throw new Error("Missing data");
  }

  return envelope.data;
}
