import { ApiResponseSchema } from "@boreal/shared-contract";

export function assertApiResponse<T = unknown>(res: unknown): T {
  const parsed = ApiResponseSchema.safeParse(res);

  if (!parsed.success) {
    throw new Error("API contract violation");
  }

  if (parsed.data.status !== "ok") {
    throw new Error(parsed.data.error || "API failure");
  }

  return parsed.data.data as T;
}
