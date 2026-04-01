import { handleAuthError } from "@/auth/authError"
import { logClientError } from "@/lib/logger"

export function handleApiError(err: unknown) {
  try {
    handleAuthError(err)
  } catch {
    // auth errors are handled centrally
  }

  logClientError("API error", err)
}
