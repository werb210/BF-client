import { apiCall } from "@/api/client";
import { logClientWarning } from "@/lib/logger";

export async function safeFetch(url: string, options?: RequestInit) {
  try {
    return await apiCall(url, options);
  } catch (error) {
    logClientWarning("API failure", { url, error });
    throw error;
  }
}
