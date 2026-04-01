import { apiCall } from "@/api/client";
import { logClientWarning } from "@/lib/logger";

export type DegradedApiResult = {
  degraded: true;
};

export async function safeFetch(url: string, options?: RequestInit) {
  try {
    return await apiCall(url, options);
  } catch (error) {
    logClientWarning("API failure", { url, error });
    if (error instanceof Error && error.message === "DB_NOT_READY") {
      return { degraded: true } satisfies DegradedApiResult;
    }
    throw error;
  }
}
