import { apiRequest } from "@/api/client";
import { logClientWarning } from "@/lib/logger";

export async function safeFetch(url: string, options?: RequestInit) {
  try {
    return await apiRequest(url, options);
  } catch {
    logClientWarning("API failure", url);
    return null;
  }
}
