export function assertApiResponse<T = unknown>(res: unknown): T {
  if (!res || typeof res !== "object" || !("status" in res)) {
    throw new Error("API contract violation");
  }

  const payload = res as { status: string; data?: T; error?: string };

  if (payload.status !== "ok") {
    throw new Error(payload.error || "API failure");
  }

  return payload.data as T;
}
