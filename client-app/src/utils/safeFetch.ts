import { apiCall } from "@/api/client";

export type DegradedApiResult = {
  degraded: true;
};

export async function safeFetch<T = Record<string, never>>(
  url: string,
  options?: RequestInit,
): Promise<T | DegradedApiResult> {
  try {
    return await apiCall<T>(url, options);
  } catch (error) {
    if (error instanceof Error && error.message === "DB_NOT_READY") {
      return { degraded: true };
    }

    throw error;
  }
}
