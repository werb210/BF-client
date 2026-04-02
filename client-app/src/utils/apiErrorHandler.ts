import { handleAuthError } from "@/auth/authError"
import { logClientError } from "@/lib/logger"

export const DEFAULT_API_ERROR_MESSAGE = "We couldn't complete your request. Please try again.";

export function handleApiError(err: unknown) {
  try {
    handleAuthError(err)
  } catch {
    // auth errors are handled centrally
  }

  logClientError("API error", err)
}
